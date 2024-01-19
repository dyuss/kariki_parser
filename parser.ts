import fs from 'fs'
import * as cheerio from 'cheerio'
import { DB_FRONT_PATH } from './config';

type Game = {
  title: string;
  link: string;
}

const url = 'https://videoigr.net/catalog/nintendo-switch-142/igri-144/page-1/';
const fileName = 'example.html';

const fetchUrl = async (nextUrl: string) => {
  const response = await fetch(nextUrl);
  return response.text();
}

const readFile = () => {
  const res = fs.readFileSync(fileName)
  return res.toString();
}

const sanitize = (str: string) => str
  .replace(/[^\w\S ]+/gim, '')
  .replace(/[ ]+/gim, ' ')
  .trim()

const parsePage = async (currentUrl: string) => {
  const html = await fetchUrl(currentUrl);
  const $ = cheerio.load(html)
  let games: any[] = [];
  const nextUrl = $('a[title="Далее"]').attr('href');

  $('table[style="width:100%; border-style:none; border-width:0px;"]:has(td.cell-img-scalable)').each((index, rootElement) => {
    const $root = $(rootElement)
    const title = $root.find('td.cell-img-scalable > a > img')!.attr('title')!;
    const link = $root.find('td.cell-img-scalable > a')!.attr('href')!;
    const id = +link.split('/')[link.split('/').length - 2]
    const img = $root.find('td.cell-img-scalable > a > img')!.attr('src')!;
    const publisherUrl = $root.find('div:contains("Издатель") > a')!.attr('href')!;
    const publisherTitle = sanitize($root.find('div:contains("Издатель") > a')!.text())
    const ageRating = $root.find('div:contains("Возрастной рейтинг") > span:last-child')!.text()!;
    const isRusSubtitles = !!$root.find('span:contains("субтитры")').text();
    const isRusVoice = !!$root.find('span:contains("озвучка")').text();
    const genres = $root.find('td[style="width:25px; height:25px;"] > img').map((_, el) => sanitize($(el).attr('alt') || '')).get();
    const price = +$root.find('span.price').text();
    const bonus = +($root.find('span.price + div').text() || '').replace(/[^\d]+/gim, '');
    const status = sanitize($root.find('td[style="text-align:center;"] > div.f-cg-b.fs-3-scalable').text());
    const game = { id, title, link, img, publisherUrl, publisherTitle, ageRating, isRusSubtitles, isRusVoice, genres, status, price, bonus }
    games = games.concat(game);
  })
  
  return { games, nextUrl }
}

const append = (filename: string, games: any[]) => {
  if (fs.existsSync(filename)) {
    console.log(fs.readFileSync(filename).toString())
  }
  const db = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename).toString()) : {games: []};
  console.log(db)
  fs.appendFileSync(filename, JSON.stringify({...db, games: db.games.concat(games) }))
}

const main = async () => {
  let currentUrl: string | undefined = url;
  let db: any[] = [];
  while (currentUrl) {
    const { games, nextUrl } = await parsePage(currentUrl);
    db = db.concat(games);
    console.log(currentUrl, games.length)
    currentUrl = nextUrl;
  }
  fs.writeFileSync('db/'+(new Date().toJSON().slice(0,10))+'.json', JSON.stringify({ games: db, date: new Date().toJSON() }))
  fs.writeFileSync(DB_FRONT_PATH, JSON.stringify({ games: db, date: new Date().toJSON() }))
  console.log('done!')
}

main();