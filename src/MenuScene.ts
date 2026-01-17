import type P5 from "p5"
import GameClient from "./main"
import { customFont } from "./font"
import LoadScene from "./LoadScene"

export default class MenuScene {
  gc: GameClient
  p5!: P5
  loadScene!: LoadScene

  constructor(gameClient: GameClient) {
    this.gc = gameClient
  }

  draw() {
    const { p5, loadScene, gc } = this

    loadScene.renderMainBackground()
    p5.noStroke()

    gc.buttons[0].render(gc.mx, gc.my)
  }

  click() {
    const gc = this.gc
    if (gc.buttons[0].isHovered) gc.buttons[0].clicked()
  }
}
