import type P5 from "p5"
import _p5_ from "p5"
import PlayScene from "./PlayScene"
import MenuScene from "./MenuScene"
import { customFont } from "./font"
import LoadScene from "./LoadScene"
import SceneController from "./SceneController"
import Button from "./Button"

declare global {
  type PositionType = [number, number]

  // subject: science, technology, engineering, math
  type SubjectType = 0 | 1 | 2 | 3
  type BodyType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  // ability: byName | byBody | byGender | bySubject | byRandom
  type AbilityType = 0 | 1 | 2 | 3 | 4
}

export function easeInOutBack(x: number): number {
  const c1 = 1.70158
  const c2 = c1 * 1.525

  return x < 0.5
    ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
    : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2
}

export function easeOutBack(x: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1

  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

export function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3)
}

export function easeOutElastic(x: number) {
  const c4 = (2 * 180) / 3
  return x === 0
    ? 0
    : x === 1
      ? 1
      : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1
}

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
        menuScene.sceneController = sceneController

        playScene.p5 = p5
        playScene.loadScene = loadScene

        sceneController.p5 = p5
        sceneController.playScene = playScene

        // create all buttons
        this.buttons = (
          [
            [
              300,
              500,
              250,
              70,
              "play",
              30,
              p5.color(176, 77, 142),
              () => {
                sceneController.setScene("PLAY")
              },
            ],
            [
              460,
              310,
              240,
              60,
              "assign",
              22,
              p5.color(40, 200, 20),
              playScene.selectController.assignClicked,
            ],
            [
              460,
              310,
              240,
              60,
              "discard",
              22,
              p5.color(200, 60, 60),
              playScene.selectController.discardClicked,
            ],
          ] as [
            number,
            number,
            number,
            number,
            string,
            number,
            P5.Color,
            Function,
          ][]
        ).map((bd) => new Button(...bd, p5))
      }

      p5.draw = () => {
        //$ rescale canvas and mouse position
        this.mx = (p5.mouseX * 600) / p5.width
        this.my = (p5.mouseY * 600) / p5.width
        p5.scale(p5.width / 600)

        p5.cursor(p5.ARROW)
        this.touchCountdown-- // update input delay

        switch (sceneController.scene) {
          case "LOAD":
            //$ set ctx
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

      p5.keyReleased = () => {
        switch (sceneController.scene) {
          case "PLAY":
            playScene.keyReleased()
            return
        }
      }
    }

    new _p5_(sketch)
  }
}

new GameClient()
