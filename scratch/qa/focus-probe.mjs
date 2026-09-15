import { chromium } from '/home/yahiro/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs'
import fs from 'node:fs/promises'
const browser = await chromium.launch({executablePath:'/home/yahiro/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args:['--no-sandbox']})
const results = []
for (const port of [3101,3100]) {
    const p = await browser.newPage({viewport:{width:1440,height:900}})
    await p.goto(`http://127.0.0.1:${port}/`)
    await p.waitForTimeout(2000)
    for(let i=0;i<14;i++) {
        await p.keyboard.press('Tab')
        await p.waitForTimeout(120)
        results.push({port,step:i,...await p.evaluate(()=>({focus:document.activeElement?.textContent,scrolls:[...document.querySelectorAll('section div')].filter(e=>e.scrollTop!==0).map(e=>({classes:e.className,top:e.scrollTop})),detail:document.querySelector('h2')?.textContent}))})
    }
    await p.screenshot({path:`scratch/qa/focus-${port}.png`})
    await p.close()
}
await fs.writeFile('scratch/qa/focus-probe.json',JSON.stringify(results,null,2))
console.log(results.filter(r=>r.scrolls.length))
await browser.close()
