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

const loop = async (p, targetUrl, nodes, links) => {
  await p.goto(targetUrl || `${prefix}Special:Random`);

  let title = getUrlTitle(targetUrl || p.url());

  if (!nodes.includes(title)) {
    nodes.push(title);
  }

  const targetHref = await findFirstLink(p);

  if (!targetHref) return;
  const targetUrlTitle = getUrlTitle(targetHref);
  console.log(`from: ${title} to: ${targetUrlTitle}`);

  links.push({
    source: title,
    target: targetUrlTitle,
  });

  if (hrefs.includes(targetHref) || hrefs.length === 50) {
    return;
  } else {
    hrefs.push(targetHref);
    await loop(p, targetHref, nodes, links);
  }
};

fs.readFile("./data.json", async (err, data) => {
  if (err) throw err;
  const { nodes, links } = JSON.parse(data.toString());
  const browser = await puppeteer.launch();

  const page = await browser.newPage();
  await loop(page, "", nodes, links);

  fs.writeFile(`./data.json`, JSON.stringify({ nodes, links }), (err) => {
    if (err) throw err;
    console.log("data updated");
  });

  await browser.close();
});
