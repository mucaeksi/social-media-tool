import {
  validLocalResult,
  LOCAL_AI_LIMITS,
  localPost,
} from "../shared/local-ai.mjs";
import { validResearchResult } from "../shared/research-protocol.mjs";
import { scheduledPublications } from "./publications.mjs";
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
    this.researchQueue = Promise.resolve();
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
    if (input.action === "wake-publications") {
      await this.runPublications();
      return Response.json({ ok: true });
    }
    // Long local inference must never hold the browser/lease command queue.
    if (input.action === "local-ai") return this.localAI(input);
    if (input.action === "research") return this.research(input);
    const run = this.queue.then(() => this.command(request));
    this.queue = run.catch(() => {});
    return run;
  }
  async research(input) {
    const run = this.researchQueue.then(async () => {
      const socket = this.ctx
        .getWebSockets(input.deviceId)
        .find(
          (s) =>
            s.readyState === 1 &&
            Date.now() - s.deserializeAttachment().seenAt < 90000,
        );
      if (!socket) throw computerError(503, "Şirket bilgisayarı çevrimdışı.");
      if (!socket.deserializeAttachment().research)
        throw computerError(
          409,
          "Web araştırması için yardımcı güncellemesini bekleyin; açık hesap ekranlarını kapatın.",
        );
      const day = new Date().toISOString().slice(0, 10),
        budget = await this.ctx.storage.get("research-budget");
      const count = budget?.day === day ? budget.count : 0;
      if (count >= 20)
        throw computerError(429, "Günlük 20 site araştırması sınırı doldu.");
      await this.ctx.storage.put("research-budget", { day, count: count + 1 });
      const result = await this.rpc(
        socket,
        { input: input.input },
        {
          type: "research-command",
          timeout: 200000,
          validate: validResearchResult,
        },
      );
      if (!result.ok)
        throw computerError(
          502,
          "Site okunamadı. HTTPS adreslerini, site erişim koşullarını ve bilgisayardaki ağı kontrol edin; gerekirse Firefox modunu deneyin.",
        );
      return Response.json(result);
    });
    this.researchQueue = run.catch(() => {});
    try {
      return await run;
    } catch (e) {
      return Response.json(
        { error: e.public ? e.message : "Web araştırması tamamlanamadı." },
        { status: e.status || 502 },
      );
    }
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
          companyTabs: Boolean(sockets[0]?.deserializeAttachment().companyTabs),
          normalLogin: Boolean(sockets[0]?.deserializeAttachment().normalLogin),
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
      const opening = ["open", "workspace", "manual-login"].includes(
        command.action,
      );
      if (
        ["manual-login", "manual-status"].includes(command.action) &&
        !socket.deserializeAttachment().normalLogin
      )
        throw computerError(
          409,
          "Normal Firefox girişi için açık hesapları kapatıp yardımcı güncellemesini bekleyin.",
        );
      if (
        (command.action === "workspace" || input.switchAccount) &&
        !socket.deserializeAttachment().companyTabs
      )
        throw computerError(
          409,
          "Tek pencereli Firefox için açık hesapları kapatıp yardımcı güncellemesini bekleyin.",
        );
      if (
        (lease?.exclusiveJobId && lease.exclusiveJobId !== input.jobId) ||
        (input.jobExclusive && lease)
      )
        throw computerError(
          409,
          "Hesap ekranı başka bir görevde. İşlem kontrolü ele geçirmedi.",
        );
      const switching =
        opening &&
        input.switchAccount &&
        lease &&
        !lease.exclusiveJobId &&
        lease.userId === userId &&
        lease.companyId === account.companyId &&
        lease.account?.profileScope === "company" &&
        account.profileScope === "company" &&
        lease.viewId === input.previousViewId;
      if (
        ![
          "open",
          "workspace",
          "manual-login",
          "manual-status",
          "screen",
          "click",
          "type",
          "key",
          "scroll",
          "login",
          "profile",
          "close",
        ].includes(command.action) &&
        !socket.deserializeAttachment().tasks
      )
        throw computerError(
          409,
          "Bu işlem için yardımcı güncellemesi gerekli. Açık hesapları kapatıp güncellemeyi bekleyin.",
        );
      if (
        lease &&
        !switching &&
        (lease.userId !== userId || lease.accountId !== account.id)
      )
        throw computerError(
          409,
          "Başka bir hesap ekranı kullanımda. Önce onu kapatın.",
        );
      if (
        !opening &&
        (!lease ||
          lease.viewId !== input.viewId ||
          lease.companyId !== account.companyId)
      )
        throw computerError(
          410,
          "Bu hesap ekranı kapandı. Hesabı yeniden açın.",
        );
      if (command.action === "manual-status" && !lease?.normalLogin)
        throw computerError(409, "Önce normal Firefox girişini başlatın.");
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
      if (switching) {
        lease = {
          ...lease,
          accountId: account.id,
          account,
          viewId: crypto.randomUUID(),
          expiresAt: Date.now() + COMPUTER_LIMITS.leaseMs,
        };
        await this.ctx.storage.put("lease", lease);
      } else if (!lease) {
        lease = {
          accountId: account.id,
          companyId: account.companyId,
          account,
          exclusiveJobId: input.jobExclusive ? input.jobId : null,
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
        const result = await this.rpc(
          socket,
          { command, account },
          command.action === "workspace" ? { timeout: 90000 } : undefined,
        );
        // A previous panel must not type into a profile after a login handoff.
        if (Boolean(result.manualLogin) !== Boolean(lease.normalLogin)) {
          lease = {
            ...lease,
            normalLogin: Boolean(result.manualLogin),
            viewId: crypto.randomUUID(),
          };
          await this.ctx.storage.put("lease", lease);
        }
        if (command.action === "close") await this.ctx.storage.delete("lease");
        return Response.json({
          ...result,
          viewId: lease.viewId,
          accountId: account.id,
        });
      } catch (error) {
        if (opening) await this.ctx.storage.delete("lease");
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
        if (
          input.input.requireAdvertising &&
          !socket.deserializeAttachment().advertising
        )
          throw computerError(
            409,
            "Reklam desteği için yardımcı 1.9 veya üzeri gerekli. Açık hesapları kapatıp yardımcı güncellemesini tamamlayın.",
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
          onProgress: input.input.jobId
            ? async (progress) => {
                if (
                  !progress ||
                  !Array.isArray(progress.posts) ||
                  progress.posts.length > input.input.selected.length ||
                  (progress.observation !== null &&
                    (typeof progress.observation !== "string" ||
                      progress.observation.length > 4000))
                )
                  return;
                const posts = progress.posts.map((p) => {
                  if (!input.input.selected.includes(p.platform))
                    throw new Error();
                  return localPost(
                    JSON.stringify(p),
                    p.platform,
                    Boolean(input.input.image),
                  );
                });
                if (new Set(posts.map((p) => p.platform)).size !== posts.length)
                  return;
                await this.env.DB.prepare(
                  "UPDATE local_ai_jobs SET progress_json=?,updated_at=? WHERE id=? AND company_id=? AND user_id=? AND state='running' AND json_array_length(json_extract(progress_json,'$.posts'))<=?",
                )
                  .bind(
                    JSON.stringify({
                      posts,
                      observation: progress.observation,
                    }),
                    new Date().toISOString(),
                    input.input.jobId,
                    input.input.companyId,
                    input.userId,
                    posts.length,
                  )
                  .run();
              }
            : undefined,
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
  runPublications() {
    if (this.publicationRun) return this.publicationRun;
    // The cron Worker only wakes this object. Browser I/O and media handling
    // stay within the existing DO, rather than the short Free cron CPU budget.
    this.publicationRun = scheduledPublications(this.env, (payload) =>
      this.fetch(
        new Request("https://computer.internal/", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      ),
    );
    this.publicationRun = this.publicationRun.finally(() => {
      this.publicationRun = null;
    });
    return this.publicationRun;
  }
  rpc(
    socket,
    payload,
    {
      type = "command",
      timeout = 25000,
      validate = validComputerResult,
      onProgress,
    } = {},
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
        onProgress,
        resultType:
          type === "command" ? "result" : type.replace(/-command$/, "-result"),
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
        advertising:
          Array.isArray(value.capabilities) &&
          value.capabilities.includes("advertising-v1"),
        research:
          Array.isArray(value.capabilities) &&
          value.capabilities.includes("research-v1"),
        tasks:
          Array.isArray(value.capabilities) &&
          value.capabilities.includes("browser-tasks-v1"),
        companyTabs:
          Array.isArray(value.capabilities) &&
          value.capabilities.includes("company-tabs-v1"),
        normalLogin:
          Array.isArray(value.capabilities) &&
          value.capabilities.includes("normal-login-v1"),
      });
      return;
    }
    if (value.type === "ping") {
      socket.send('{"type":"pong"}');
      return;
    }
    const pending = this.pending.get(value.id);
    if (!pending || pending.socket !== socket) return;
    if (value.type === "ai-progress") {
      if (pending.onProgress) {
        pending.progressQueue = (pending.progressQueue || Promise.resolve())
          .then(() => pending.onProgress(value.progress))
          .catch(() => {});
        await pending.progressQueue;
      }
      return;
    }
    await pending.progressQueue;
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
