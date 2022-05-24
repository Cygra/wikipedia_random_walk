const puppeteer = require("puppeteer");
const fs = require("fs");

const prefix = "https://en.wikipedia.org/wiki/";

const getUrlTitle = (href) => {
  let result = decodeURIComponent(href.replace(prefix, "").split("#")[0]);
  if (
    [
      "Latin",
      "Communication",
      "Language",
      "Classical_language",
      "Latin_language",
    ].includes(result)
  ) {
    result = `Latin, Communication Language, Classical_language, Latin_language`;
  }
  return result;
};

const findFirstLink = async (p) => {
  await p.waitForSelector(`#bodyContent`);
  const anchors = await p.evaluate(() =>
    Array.from(document.querySelectorAll("p > a"), (el) => el.href)
  );
  const href = anchors.find((it) => it.startsWith(prefix));
  return href;
};

const hrefs = [];

const loop = async (p, currentUrl) => {
  await p.goto(currentUrl || `${prefix}Special:Random`);

  const targetHref = await findFirstLink(p);

  if (!targetHref) return;

  let result = getUrlTitle(targetHref);

  if (hrefs.includes(result) || hrefs.length === 50) {
    return;
  } else {
    console.log(
      `from: ${getUrlTitle(currentUrl || p.url())} to: ${getUrlTitle(
        targetHref
      )}`
    );
    hrefs.unshift(result);
    await loop(p, targetHref);
  }
};

fs.readFile("./tree.json", async (err, data) => {
  if (err) throw err;
  const json = JSON.parse(data.toString());
  const browser = await puppeteer.launch();

  const page = await browser.newPage();
  await loop(page, "");

  let current = json;
  hrefs.forEach((it) => {
    const match = current.children.find((cur) => cur.name === it);
    if (match) {
      current = match;
    } else {
      const child = { name: it, children: [] };
      current.children.push(child);
      current = child;
    }
  });

  fs.writeFile(`./tree.json`, JSON.stringify(json), (err) => {
    if (err) throw err;
    console.log("data updated");
  });

  await browser.close();
});
