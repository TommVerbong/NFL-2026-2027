#!/usr/bin/env python3
import asyncio, json, re
from datetime import datetime, timezone
from pathlib import Path
from playwright.async_api import async_playwright
SEASON=2026
BASE="https://www.nfl.com/stats/player-stats/category/{category}/2026/reg/all/{sort}/desc"
CATEGORIES={"passing":("passing","passingyards"),"rushing":("rushing","rushingyards"),"receiving":("receiving","receivingyards"),"tackles":("tackles","defensivecombinetackles"),"sacks":("defense","defensivesacks"),"interceptions":("interceptions","defensiveinterceptions")}
VALUE_HEADERS={"passing":["Pass Yds","Yds"],"rushing":["Rush Yds","Yds"],"receiving":["Rec Yds","Yds"],"tackles":["Comb","Total","Tackles"],"sacks":["Sck","Sacks"],"interceptions":["Int","Interceptions"]}
async def scrape(page,key,category,sort):
 url=BASE.format(category=category,sort=sort);await page.goto(url,wait_until="domcontentloaded",timeout=90000);await page.wait_for_timeout(5000)
 headers=[(await h.inner_text()).strip() for h in await page.locator("table thead th").all()];vi=next((i for i,h in enumerate(headers) if any(c.lower() in h.lower() for c in VALUE_HEADERS[key])),None);out=[]
 for row in (await page.locator("table tbody tr").all())[:15]:
  cells=[re.sub(r"\s+"," ",(await c.inner_text()).strip()) for c in await row.locator("td").all()]
  if len(cells)<2:continue
  pc=cells[0];player=re.sub(r"\s+[A-Z]{2,3}\s+\d+$","",pc).strip();m=re.search(r"\b([A-Z]{2,3})\b",pc);team=m.group(1) if m else "";value=cells[vi] if vi is not None and vi<len(cells) else cells[1]
  if player and value:out.append({"player":player,"team":team,"value":value})
  if len(out)==5:break
 return out,url
async def main():
 data={"season":SEASON,"seasonType":"REG","source":"NFL.com","updatedAt":datetime.now(timezone.utc).isoformat(),"message":"Nog geen statistieken beschikbaar voor NFL Regular Season 2026.","categories":{},"urls":{}}
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);page=await b.new_page(viewport={"width":1440,"height":1200},user_agent="Mozilla/5.0 GitHubActions NFL-Poule/1.0")
  for key,(cat,sort) in CATEGORIES.items():
   try:data["categories"][key],data["urls"][key]=await scrape(page,key,cat,sort)
   except Exception as e:print(key,e);data["categories"][key]=[]
  await b.close()
 if any(data["categories"].values()):data["message"]=""
 Path("data/nfl-leaders.json").write_text(json.dumps(data,indent=2,ensure_ascii=False),encoding="utf-8")
if __name__=="__main__":asyncio.run(main())
