"""Resmi ve herkese açık belgelerden kısa kaynak kesitleri toplar. Secret kullanmaz."""
import concurrent.futures
import datetime
import html.parser
import json
import os
import pathlib
import re
import urllib.request

SOURCES = [
    ("youtube", "https://developers.google.com/youtube/v3/getting-started"),
    ("youtube", "https://developers.google.com/youtube/v3/determine_quota_cost"),
    ("youtube", "https://developers.google.com/youtube/v3/docs/videos/insert"),
    ("linkedin", "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-api"),
    ("linkedin", "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-api/overview"),
    ("linkedin", "https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access"),
    ("linkedin", "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api"),
    ("tiktok", "https://developers.tiktok.com/doc/content-sharing-guidelines"),
    ("tiktok", "https://developers.tiktok.com/doc/content-posting-api-get-started"),
    ("pinterest", "https://developers.pinterest.com/docs/getting-started/connect-app/"),
    ("pinterest", "https://developers.pinterest.com/docs/getting-started/set-up-app/"),
    ("threads", "https://developers.facebook.com/docs/threads/"),
    ("threads", "https://developers.facebook.com/docs/threads/posts/"),
    ("facebook", "https://developers.facebook.com/docs/pages-api/posts/"),
    ("instagram", "https://developers.facebook.com/docs/instagram-platform/content-publishing/"),
]

class Text(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.parts = []
        self.main_parts = []
        self.in_main = False
        self.source = None
        self.links = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "main":
            self.in_main = True
        if tag == "meta" and attrs.get("name") == "original_content_git_url":
            self.source = attrs.get("content")
        if tag == "a" and re.search(r"tier|increasing-access", attrs.get("href", "")):
            self.links.add(attrs["href"])
        if tag in ("script", "style", "noscript"):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag == "main":
            self.in_main = False
        if tag in ("script", "style", "noscript"):
            self.skip = max(0, self.skip - 1)

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)
            if self.in_main:
                self.main_parts.append(data)


def check(source):
    platform, url = source
    result = {"platform": platform, "url": url}
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "SosyalStudio-DocumentationCheck/1.0"})
        with urllib.request.urlopen(request, timeout=25) as response:
            result["httpStatus"] = response.status
            parser = Text()
            parser.feed(response.read(2_000_000).decode("utf-8", errors="replace"))
        content = re.sub(r"\s+", " ", " ".join(parser.main_parts or parser.parts)).strip()
        result["title"] = content[:160]
        if parser.source:
            result["sourceRepository"] = parser.source
        result["accessLinks"] = sorted(parser.links)[:8]
        patterns = {
            "quota": r"(?:default[^.]{0,100}quota)|(?:quota[^.]{0,100}100)|10,000|100 calls per day",
            "payment": r"free of charge|free to use|no charge|at no cost|free quota|pricing",
            "access": r"Development tier|Standard tier|Trial access|trial tier|w_organization_social|threads_content_publish",
            "review": r"audit|unaudited|review process|private viewing|private mode|SELF_ONLY",
            "internal_tool": r"internal groups|your team|Utility tool|client[s]? you manage",
        }
        excerpts = {}
        for key, pattern in patterns.items():
            match = re.search(pattern, content, re.I)
            if match:
                excerpts[key] = content[max(0, match.start()-100):match.end()+210]
        result["excerpts"] = excerpts
        result["retrieved"] = len(content) > 1000 and not bool(re.search(r"^(Just a moment|Access Denied)", content, re.I))
    except Exception as error:
        result["retrieved"] = False
        result["error"] = type(error).__name__
        if hasattr(error, "code"):
            result["httpStatus"] = error.code
    return result


if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(check, SOURCES))
    report = {
        "checkedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "sourceCommit": os.environ.get("GITHUB_SHA"),
        "publicSourcesOnly": True,
        "results": results,
    }
    pathlib.Path(".cloudflare").mkdir(exist_ok=True)
    pathlib.Path(".cloudflare/platform-research.json").write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))
