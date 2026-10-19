import { validLocalResult, LOCAL_AI_LIMITS } from "../shared/local-ai.mjs";
import {
  COMPUTER_LIMITS,
  computerError,
  validComputerResult,
} from "../shared/computer-protocol.mjs";

// Only authenticated Worker routes reach this DO. Screens/keystrokes are never
// persisted. Hibernatable outbound agent socket; no tunnel or inbound PC port.
export class CompanyComputer {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.pending = new Map();
    this.queue = Promise.resolve();
    this.aiQueue = Promise.resolve();
  }
  async fetch(request) {
    if (request.headers.get("upgrade") === "websocket") {
      const id = request.headers.get("X-Device-Id");
      if (!id)
        return Response.json(
          { error: "Cihaz kimliği eksik." },
          { status: 401 },
        );
      for (const old of this.ctx.getWebSockets()) {
        old.close(4000, "Yeni bağlantı açıldı.");
      }
      const pair = new WebSocketPair(),
        [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server, [id]);
      server.serializeAttachment({ id, seenAt: Date.now() });
      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: { "Sec-WebSocket-Protocol": "sosyal-device-v1" },
      });
    }
    const input = await request.clone().json();
    // Long local inference must never hold the browser/lease command queue.
    if (input.action === "local-ai") return this.localAI(input);
    const run = this.queue.then(() => this.command(request));
    this.queue = run.catch(() => {});
    return run;
  }
  async command(request) {
    try {
      const input = await request.json();
      if (input.action === "revoke") {
        for (const socket of this.ctx.getWebSockets(input.deviceId)) {
          socket.send(JSON.stringify({ type: "revoked" }));
          socket.close(4001, "Eşleştirme kaldırıldı.");
        }
        await this.ctx.storage.delete("lease");
        return Response.json({ ok: true });
      }
      let lease = await this.ctx.storage.get("lease");
      if (lease && lease.expiresAt <= Date.now()) {
        await this.ctx.storage.delete("lease");
        lease = null;
      }
      if (input.action === "remove") {
        if (
          lease &&
          (lease.accountId === input.accountId ||
            lease.companyId === input.companyId)
        ) {
          const socket = this.ctx
            .getWebSockets()
            .find((s) => s.readyState === 1);
          if (socket && lease.account)
            await this.rpc(socket, {
              account: lease.account,
              command: { action: "close" },
            }).catch(() => {});
          await this.ctx.storage.delete("lease");
        }
        return Response.json({ ok: true });
      }
      const sockets = this.ctx
        .getWebSockets()
        .filter(
          (s) =>
            s.readyState === 1 &&
            Date.now() - s.deserializeAttachment().seenAt < 90000,
        );
      const budget = await this.ctx.storage.get("budget"),
        day = new Date().toISOString().slice(0, 10);
      if (input.action === "status")
        return Response.json({
          onlineDeviceId: sockets[0]?.deserializeAttachment().id ?? null,
          active: lease
            ? {
                accountId: lease.accountId,
                companyId: lease.companyId,
                owned: lease.userId === input.userId,
              }
            : null,
          commandsUsed: budget?.day === day ? budget.count : 0,
          dailyCommands: COMPUTER_LIMITS.dailyCommands,
        });
      const socket = sockets.find(
        (s) => s.deserializeAttachment().id === input.deviceId,
      );
      if (!socket)
        throw computerError(
          503,
          "Şirket bilgisayarı çevrimdışı. Bilgisayarda Sosyal Studio yardımcısını başlatın.",
        );
      const { command, account, userId } = input;
      if (lease && (lease.userId !== userId || lease.accountId !== account.id))
        throw computerError(
          409,
          "Başka bir hesap ekranı kullanımda. Önce onu kapatın.",
        );
      if (
        command.action !== "open" &&
        (!lease ||
          lease.viewId !== input.viewId ||
          lease.companyId !== account.companyId)
      )
        throw computerError(
          410,
          "Bu hesap ekranı kapandı. Hesabı yeniden açın.",
        );
      const count = budget?.day === day ? budget.count : 0;
      if (count >= COMPUTER_LIMITS.dailyCommands)
        throw computerError(
          429,
          "Ücretsiz günlük uzaktan kontrol bütçesi doldu. Hesap profilleri bilgisayarda korunuyor; yeni UTC gününde panelden devam edebilirsiniz.",
        );
      const second = Math.floor(Date.now() / 1000),
        burst = budget?.second === second ? budget.burst : 0;
      if (burst >= 6)
        throw computerError(
          429,
          "İşlemler çok hızlı gönderildi. Bir saniye bekleyin.",
        );
      await this.ctx.storage.put("budget", {
        day,
        count: count + 1,
        second,
        burst: burst + 1,
      });
      if (!lease) {
        lease = {
          accountId: account.id,
          companyId: account.companyId,
          account,
          userId,
          viewId: crypto.randomUUID(),
          expiresAt: Date.now() + COMPUTER_LIMITS.leaseMs,
        };
        await this.ctx.storage.put("lease", lease);
      } else if (
        lease.expiresAt <
        Date.now() + COMPUTER_LIMITS.leaseMs - 60000
      ) {
        lease.expiresAt = Date.now() + COMPUTER_LIMITS.leaseMs;
        await this.ctx.storage.put("lease", lease);
      }
      try {
        const result = await this.rpc(socket, { command, account });
        if (command.action === "close") await this.ctx.storage.delete("lease");
        return Response.json({
          ...result,
          viewId: lease.viewId,
          accountId: account.id,
        });
      } catch (error) {
        if (command.action === "open") await this.ctx.storage.delete("lease");
        throw error;
      }
    } catch (error) {
      return Response.json(
        {
          error: error.public
            ? error.message
            : "Bilgisayar işlemi tamamlanamadı.",
        },
        { status: error.status || 502 },
      );
    }
  }
  async localAI(input) {
    try {
      const gate = this.aiQueue.then(async () => {
        const socket = this.ctx
          .getWebSockets()
          .find(
            (s) =>
              s.readyState === 1 &&
              s.deserializeAttachment().id === input.deviceId &&
              Date.now() - s.deserializeAttachment().seenAt < 90000,
          );
        if (!socket)
          throw computerError(
            503,
            "Şirket bilgisayarı çevrimdışı. Yardımcıyı başlatın.",
          );
        if (!socket.deserializeAttachment().localAI)
          throw computerError(
            409,
            "Yardımcı güncellenmeli. Açık hesap ekranlarını kapatın; otomatik güncellemeden sonra tekrar deneyin.",
          );
        if (input.input.action !== "status") {
          const now = Date.now(),
            day = new Date(now).toISOString().slice(0, 10);
          const budget = (await this.ctx.storage.get("local-ai-budget")) || {};
          const requests = (budget.requests || []).filter(
            (r) => r.at > now - 3600000,
          );
          const count = budget.day === day ? budget.count : 0;
          const setups = budget.day === day ? budget.setups : 0;
          if (
            (input.input.action === "generate" &&
              (count >= LOCAL_AI_LIMITS.dailyRequests ||
                requests.filter((r) => r.userId === input.userId).length >=
                  LOCAL_AI_LIMITS.hourlyRequests)) ||
            (input.input.action === "setup" && setups >= 3)
          )
            throw computerError(
              429,
              "Yerel AI istek sınırı doldu: günde 50 üretim, kullanıcı başına saatte 10 istek ve günde 3 kurulum denemesi.",
            );
          await this.ctx.storage.put("local-ai-budget", {
            day,
            count: count + (input.input.action === "generate" ? 1 : 0),
            setups: setups + (input.input.action === "setup" ? 1 : 0),
            requests:
              input.input.action === "generate"
                ? [...requests, { userId: input.userId, at: now }]
                : requests,
          });
        }
        return socket;
      });
      this.aiQueue = gate.catch(() => {});
      const socket = await gate;
      const result = await this.rpc(
        socket,
        { input: input.input },
        {
          type: "ai-command",
          timeout: input.input.action === "generate" ? 280000 : 12000,
          validate: validLocalResult,
        },
      );
      return Response.json(result);
    } catch (error) {
      return Response.json(
        {
          error: error.public
            ? error.message
            : "Yerel AI bağlantısı tamamlanamadı.",
        },
        { status: error.status || 502 },
      );
    }
  }
  rpc(
    socket,
    payload,
    { type = "command", timeout = 25000, validate = validComputerResult } = {},
  ) {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          computerError(
            504,
            "Bilgisayar zamanında yanıt vermedi. Bağlantıyı kontrol edip yeniden deneyin.",
          ),
        );
      }, timeout);
      this.pending.set(id, {
        socket,
        validate,
        resultType: type === "ai-command" ? "ai-result" : "result",
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      try {
        socket.send(JSON.stringify({ type, id, ...payload }));
      } catch {
        this.pending
          .get(id)
          ?.reject(computerError(503, "Bilgisayar bağlantısı kesildi."));
        this.pending.delete(id);
      }
    });
  }
  async webSocketMessage(socket, message) {
    if (
      typeof message !== "string" ||
      message.length > COMPUTER_LIMITS.messageBytes
    ) {
      socket.close(1009, "İleti çok büyük.");
      return;
    }
    let value;
    try {
      value = JSON.parse(message);
    } catch {
      socket.close(1008, "Geçersiz ileti.");
      return;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      socket.close(1008, "Geçersiz ileti.");
      return;
    }
    const info = socket.deserializeAttachment();
    socket.serializeAttachment({ ...info, seenAt: Date.now() });
    if (value.type === "hello") {
      socket.serializeAttachment({
        ...info,
        seenAt: Date.now(),
        localAI:
          Array.isArray(value.capabilities) &&
          value.capabilities.includes("local-ai-v1"),
      });
      return;
    }
    if (value.type === "ping") {
      socket.send('{"type":"pong"}');
      return;
    }
    const pending = this.pending.get(value.id);
    if (!pending || pending.socket !== socket) return;
    this.pending.delete(value.id);
    if (value.type === pending.resultType && pending.validate(value.result))
      pending.resolve(value.result);
    else
      pending.reject(
        computerError(
          502,
          "Bilgisayar tarayıcısı işlemi tamamlayamadı. Bilgisayardaki pencereyi ve bağlantıyı kontrol edin.",
        ),
      );
  }
  webSocketClose(socket) {
    for (const [id, item] of this.pending)
      if (item.socket === socket) {
        item.reject(computerError(503, "Bilgisayar bağlantısı kesildi."));
        this.pending.delete(id);
      }
  }
  webSocketError(socket) {
    this.webSocketClose(socket);
  }
}
