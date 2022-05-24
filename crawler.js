const puppeteer = require("puppeteer");
const fs = require("fs");

const prefix = "https://en.wikipedia.org/wiki/";

const getUrlTitle = (href) =>
  decodeURIComponent(href.replace(prefix, "").split("#")[0]);

const findFirstLink = async (p) => {
  await p.waitForSelector(`#bodyContent`);
  const anchors = await p.evaluate(() =>
    Array.from(document.querySelectorAll("p > a"), (el) => el.href)
  );
  const href = anchors.find((it) => it.startsWith(prefix));
  return href;
};

const hrefs = [];

const loop = async (p, targetUrl) => {
  await p.goto(targetUrl || `${prefix}Special:Random`);

  let title = getUrlTitle(targetUrl || p.url());

  const targetHref = await findFirstLink(p);

  if (!targetHref) return;
  const targetUrlTitle = getUrlTitle(targetHref);
  console.log(`from: ${title} to: ${targetUrlTitle}`);

  if (hrefs.includes(targetHref) || hrefs.length === 50) {
    return;
  } else {
    hrefs.unshift(targetHref);
    await loop(p, targetHref);
  }
};

fs.readFile("./tree.json", async (err, data) => {
  if (err) throw err;
  const json = JSON.parse(data.toString());
  const browser = await puppeteer.launch();

  const page = await browser.newPage();
  await loop(page, "");

  console.log(hrefs.map(getUrlTitle));

  let current = json;
  hrefs.forEach((it) => {
    const title = getUrlTitle(it);
    const match = current.children.find((cur) => cur.name === title);
    if (match) {
      current = match;
    } else {
      const child = { name: title, children: [] };
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
