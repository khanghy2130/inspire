import type P5 from "p5"
import _p5_ from "p5"
import PlayScene from "./PlayScene"
import MenuScene from "./MenuScene"
import { customFont } from "./font"
import LoadScene from "./LoadScene"
import SceneController from "./SceneController"
import Button from "./Button"

export default class GameClient {
  // rescaled mouse position (0 to 400 width)
  mx: number = 0
  my: number = 0
  touchCountdown: number = 0
  avatarSheet?: P5.Image
  buttons: Button[] = []

  constructor() {
    const loadScene = new LoadScene(this)
    const menuScene = new MenuScene(this)
    const playScene = new PlayScene(this)
    const sceneController = new SceneController()

    const sketch = (p5: _p5_) => {
      const getCanvasSize = () => {
        const HEIGHT_RATIO = 1
        const CANVAS_WIDTH = Math.min(
          window.innerWidth,
          window.innerHeight / HEIGHT_RATIO,
        )
        return [CANVAS_WIDTH, CANVAS_WIDTH * HEIGHT_RATIO]
      }

      p5.windowResized = () => {
        const [w, h] = getCanvasSize()
        p5.resizeCanvas(w, h)
      }

      p5.preload = () => {
        this.avatarSheet = p5.loadImage("./assets/avatars.webp")
      }

      p5.setup = () => {
        const [w, h] = getCanvasSize()
        p5.createCanvas(
          w,
          h,
          p5.P2D,
          document.getElementById("game-canvas") as HTMLCanvasElement,
        )

        // p5 configs
        p5.textAlign(p5.CENTER, p5.CENTER)
        p5.rectMode(p5.CENTER)
        p5.imageMode(p5.CENTER)
        p5.angleMode(p5.RADIANS)
        p5.strokeJoin(p5.ROUND)
        p5.frameRate(60)

        // connect instances //$
        loadScene.p5 = p5
        loadScene.sceneController = sceneController

        menuScene.p5 = p5
        menuScene.loadScene = loadScene

        playScene.p5 = p5

        sceneController.p5 = p5

        // create all buttons
        this.buttons = (
          [[300, 500, 250, 70, "play", 30, () => {}]] as [
            number,
            number,
            number,
            number,
            string,
            number,
            Function,
          ][]
        ).map((bd) => new Button(...bd, p5))
      }

      p5.draw = () => {
        //$ if less than x frameCount, set ctx and return

        //$ rescale canvas and mouse position
        this.mx = (p5.mouseX * 600) / p5.width
        this.my = (p5.mouseY * 600) / p5.width
        p5.scale(p5.width / 600)

        p5.cursor(p5.ARROW)
        this.touchCountdown-- // update input delay

        switch (sceneController.scene) {
          case "LOAD":
            loadScene.update()
            loadScene.draw()
            break
          case "MENU":
            menuScene.draw()
            break
          case "PLAY":
            playScene.draw()
            break
        }
        sceneController.updateAndRender()
      }
      p5.touchEnded = () => {
        if (this.touchCountdown > 0) return
        else this.touchCountdown = 5

        switch (sceneController.scene) {
          case "MENU":
            menuScene.click()
            return
          case "PLAY":
            playScene.click()
            return
        }
      }
    }

    new _p5_(sketch)
  }
}

new GameClient()
