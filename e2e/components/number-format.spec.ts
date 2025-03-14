import { getText, url } from '../helper'
;['composition'].forEach(pattern => {
  describe(`${pattern}`, () => {
    beforeAll(async () => {
      await page.goto(url(`/examples/${pattern}/components/number-format.html`))
    })

    test('rendering', async () => {
      expect(await getText(page, '#app p.p1')).toMatch('100')
      expect(await getText(page, '#app p.p2')).toMatch('$100.00')
      expect(await getText(page, '#app p.p3')).toMatch('￥100')
      expect(await getText(page, '#app div.slot')).toMatch('€1,234.00')
    })
  })
})
