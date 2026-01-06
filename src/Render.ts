import type P5 from "p5"
import GameClient from "./main"
import Gameplay from "./Gameplay"
import { customFont } from "./font"

export type PositionType = [number, number]


export default class Render {
  gc: GameClient
  p5!: P5
  gameplay!: Gameplay
  constructor(gameClient: GameClient) {
    this.gc = gameClient
  }

  
  draw() {
    const { p5, gameplay: gp } = this
    p5.cursor(p5.ARROW)

    p5.background(26, 23, 11)
    p5.noStroke()
  }

  click() {
    const gp = this.gameplay

  }

  keyPressed() {}
}
