import type P5 from "p5"
import GameClient from "./main"
import { customFont } from "./font"
import LoadScene from "./LoadScene"
import SceneController from "./SceneController"
import PlayScene from "./PlayScene"

export default class EndScene {
  gc: GameClient
  p5!: P5
  loadScene!: LoadScene
  playScene!: PlayScene
  sceneController!: SceneController

  constructor(gameClient: GameClient) {
    this.gc = gameClient
  }

  draw() {
    const { p5, loadScene, gc } = this

    loadScene.renderMainBackground()
  }

  click() {
    if (!this.sceneController.isNotTransitioning()) {
      return
    }
  }
}
