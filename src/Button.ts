import type P5 from "p5"
import { customFont } from "./font"

export default class Button {
  p5: P5
  isHovered: boolean = false
  prg: number = 1
  x: number
  y: number
  w: number
  h: number
  str: string
  strSize: number
  strX: number
  strY: number
  c1: P5.Color
  c2: P5.Color
  clicked: Function

  constructor(
    x: number,
    y: number,
    w: number,
    h: number,
    str: string,
    strSize: number,
    colorValue: P5.Color,
    clicked: Function,
    p5: P5,
  ) {
    // strSize += 10

    this.p5 = p5
    this.x = x
    this.y = y
    this.w = w
    this.h = h
    this.str = str
    this.strSize = strSize
    this.strX =
      customFont.render(str, -100, -100, strSize, p5.color(0, 0), p5) * 0.5
    this.strY = -strSize * 0.5

    this.c1 = colorValue
    this.c2 = p5.lerpColor(colorValue, p5.color(0), 0.15)

    this.clicked = () => {
      this.prg = 0
      clicked()
    }
  }

  render(mx: number, my: number) {
    const p5 = this.p5

    // check hover
    const hw = this.w / 2,
      hh = this.h / 2
    if (
      mx > this.x - hw &&
      mx < this.x + hw &&
      my > this.y - hh &&
      my < this.y + hh
    ) {
      if (!this.isHovered) {
        this.prg = 0 // initial hover
      }
      this.isHovered = true
      p5.cursor(p5.HAND)
    } else {
      this.isHovered = false // not hovered
    }

    const ANIMATE_SPEED = 0.05
    if (this.isHovered) {
      this.prg = p5.min(this.prg + ANIMATE_SPEED, 0.6)
    } else {
      this.prg = p5.min(this.prg + ANIMATE_SPEED, 1)
    }

    // render button
    p5.noStroke()
    p5.fill(this.c1)
    p5.rect(this.x, this.y - this.h / 4, this.w, this.h / 2, 15, 15, 0, 0)
    p5.fill(this.c2)
    p5.rect(this.x, this.y + this.h / 4, this.w, this.h / 2, 0, 0, 15, 15)

    const f = 1 - this.prg
    p5.strokeWeight(f * 7)
    p5.noFill()
    p5.stroke(250)
    p5.rect(this.x, this.y, this.w, this.h, 15)

    customFont.render(
      this.str,
      this.x - this.strX,
      this.y - this.strY,
      this.strSize,
      p5.color(250),
      p5,
    )
  }
}
