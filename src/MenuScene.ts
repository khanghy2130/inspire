import type P5 from "p5"
import GameClient from "./main"
import { customFont } from "./font"
import LoadScene from "./LoadScene"
import SceneController from "./SceneController"

export default class MenuScene {
  gc: GameClient
  p5!: P5
  loadScene!: LoadScene
  sceneController!: SceneController

  constructor(gameClient: GameClient) {
    this.gc = gameClient
  }

  draw() {
    const { p5, loadScene, gc } = this

    loadScene.renderMainBackground()
    p5.colorMode(p5.HSB)
    const fc = p5.frameCount * 0.01
    const fcx = ((fc * 100) % 650) - 20

    // behind
    p5.strokeWeight(15)
    for (let x = -4; x < 604; x += 2) {
      const rad = x * 0.02 + fc
      // is going down?
      const s = p5.sin(rad)
      if (-s > 0) {
        p5.stroke(
          (rad * 10 + fc * 40) % 255,
          255 - (x > fcx - 30 && x < fcx + 30 ? 255 : 0),
          155 + s * 100,
        )
        p5.point(x, 210 + p5.cos(rad) * 100)
      }
    }

    customFont.render("inspire", 50, 260, 90, p5.color(255, 0, 230), p5)

    // front
    p5.strokeWeight(15)
    for (let x = -4; x < 604; x += 2) {
      const rad = x * 0.02 + fc
      // is going up?
      const s = p5.sin(rad)
      if (-s <= 0) {
        p5.stroke(
          (rad * 10 + fc * 40) % 255,
          255 - (x > fcx - 30 && x < fcx + 30 ? 255 : 0),
          155 + s * 100,
        )
        p5.point(x, 210 + p5.cos(rad) * 100)
      }
    }

    // update menu button colors
    const menuButton = gc.buttons[0]
    menuButton.c1 = p5.color((fc * 20) % 255, 255, 140)
    menuButton.c2 = p5.color((fc * 20) % 255, 255, 120)

    p5.colorMode(p5.RGB)

    menuButton.render(gc.mx, gc.my)
  }

  click() {
    if (!this.sceneController.isNotTransitioning()) {
      return
    }
    const gc = this.gc
    if (gc.buttons[0].isHovered) {
      gc.buttons[0].clicked()
      //@
      return
    }
  }
}
