#!/usr/bin/env python3
import asyncio, json, re
from datetime import datetime, timezone
from pathlib import Path
from playwright.async_api import async_playwright

SEASON=2026
BASE='https://www.nfl.com/stats/player-stats/category/{category}/2026/reg/all/{sort}/desc'
CATEGORIES={
 'passing':('passing','passingyards'),
 'rushing':('rushing','rushingyards'),
 'receiving':('receiving','receivingreceptions'),
 'tackles':('tackles','defensivecombinetackles'),
 'sacks':('defense','defensivesacks'),
 'interceptions':('interceptions','defensiveinterceptions'),
}
VALUE_HEADERS={
 'passing':['Pass Yds','Yds'], 'rushing':['Rush Yds','Yds'], 'receiving':['Rec Yds','Yds','Rec'],
 'tackles':['Comb','Total','Tackles'], 'sacks':['Sck','Sacks'], 'interceptions':['Int','Interceptions']
}
async def scrape(page,key,category,sort):
    url=BASE.format(category=category,sort=sort)
    await page.goto(url,wait_until='domcontentloaded',timeout=90000)
    await page.wait_for_timeout(5000)
    rows=await page.locator('table tbody tr').all()
    result=[]
    headers=[(await h.inner_text()).strip() for h in await page.locator('table thead th').all()]
    candidates=VALUE_HEADERS[key]
    val_index=next((i for i,h in enumerate(headers) if any(c.lower() in h.lower() for c in candidates)),None)
    for row in rows[:15]:
        cells=[re.sub(r'\s+',' ',(await c.inner_text()).strip()) for c in await row.locator('td').all()]
        if len(cells)<2: continue
        player_cell=cells[0]
        player=re.sub(r'\s+[A-Z]{2,3}\s+\d+$','',player_cell).strip()
        team=''
        mt=re.search(r'\b([A-Z]{2,3})\b',player_cell)
        if mt: team=mt.group(1)
        value=cells[val_index] if val_index is not None and val_index<len(cells) else cells[1]
        if player and value: result.append({'player':player,'team':team,'value':value})
        if len(result)==5: break
    return result,url
async def main():
    output={'season':SEASON,'seasonType':'REG','source':'NFL.com','updatedAt':datetime.now(timezone.utc).isoformat(),'message':'Nog geen statistieken beschikbaar voor NFL Regular Season 2026.','categories':{},'urls':{}}
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True)
        page=await browser.new_page(viewport={'width':1440,'height':1200},user_agent='Mozilla/5.0 GitHubActions NFL-Poule/1.0')
        for key,(cat,sort) in CATEGORIES.items():
            try:
                rows,url=await scrape(page,key,cat,sort)
                output['categories'][key]=rows
                output['urls'][key]=url
            except Exception as exc:
                print(f'{key}: {exc}')
                output['categories'][key]=[]
        await browser.close()
    if any(output['categories'].values()): output['message']=''
    Path('data').mkdir(exist_ok=True)
    Path('data/nfl-leaders.json').write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding='utf-8')
if __name__=='__main__': asyncio.run(main())
