import type P5 from "p5"
import { customFont } from "./font"
import originalCards, { OriginalCard } from "./originalCards"
import GameClient from "./main"

export default class LoadScene {
  gc: GameClient
  p5!: P5
  isLoaded: boolean = false

  starImage!: P5.Image
  cardBackside!: P5.Image
  backgroundImage!: P5.Image
  subjectIconImages: P5.Image[] = []
  projectPanelImages: P5.Image[] = []
  cardImages: P5.Image[] = []

  readonly SUBJECT_COLORS: [number, number, number][] = [
    [60, 220, 145], // green
    [85, 180, 240], // blue
    [205, 145, 235], // purple (orange)
    [235, 200, 85], // yellow
  ]
  readonly GRAY_COLOR = 30

  // readonly GENDER_COLORS: [number, number, number][] = [
  //   [115, 185, 235], // male
  //   [230, 170, 220], // female
  // ]

  private imagesCreateFunctions: Function[] = [
    // create subject icons (60x60)
    () => {
      const p5 = this.p5
      const sqSize = p5.width * 0.1
      p5.noFill()

      // science
      p5.clear()
      p5.stroke(0)
      p5.strokeWeight(10)
      for (let i = 0; i < 3; i++) {
        p5.push()
        p5.translate(30, 30)
        p5.rotate((p5.PI / 3) * i)
        p5.ellipse(0, 0, 48, 15)
        p5.pop()
      }
      // ---
      p5.strokeWeight(4)
      p5.stroke(...this.SUBJECT_COLORS[0])
      for (let i = 0; i < 3; i++) {
        p5.push()
        p5.translate(30, 30)
        p5.rotate((p5.PI / 3) * i)
        p5.ellipse(0, 0, 48, 15)
        p5.pop()
      }
      this.subjectIconImages[0] = p5.get(0, 0, sqSize, sqSize)

      // tech
      p5.clear()
      const CUBE_X = p5.sqrt(3) * 10
      p5.strokeWeight(12)
      p5.stroke(0)
      for (let i = 0; i < 3; i++) {
        p5.push()
        p5.translate(30, 90)
        p5.rotate((p5.PI / 3) * 2 * i)
        p5.line(0, 0, 0, 20)
        p5.line(CUBE_X, 10, 0, 20)
        p5.line(CUBE_X, 10, CUBE_X, -10)
        p5.pop()
      }
      // ---
      p5.strokeWeight(5)
      p5.stroke(...this.SUBJECT_COLORS[1])
      for (let i = 0; i < 3; i++) {
        p5.push()
        p5.translate(30, 90)
        p5.rotate((p5.PI / 3) * 2 * i)
        p5.line(0, 0, 0, 20)
        p5.line(CUBE_X, 10, 0, 20)
        p5.line(CUBE_X, 10, CUBE_X, -10)
        p5.pop()
      }
      this.subjectIconImages[1] = p5.get(0, sqSize, sqSize, sqSize)

      // engineer
      p5.clear()
      p5.noStroke()
      p5.fill(0)
      for (let i = 0; i < 8; i++) {
        p5.push()
        p5.translate(30, 150)
        p5.rotate(p5.QUARTER_PI * i)
        p5.quad(-9, -18, 9, -18, 5, -28, -5, -28)
        p5.pop()
      }
      p5.noFill()
      p5.strokeWeight(12)
      p5.stroke(0)
      p5.ellipse(30, 150, 30, 30)
      // ---
      p5.noStroke()
      p5.fill(...this.SUBJECT_COLORS[2])
      for (let i = 0; i < 8; i++) {
        p5.push()
        p5.translate(30, 150)
        p5.rotate(p5.QUARTER_PI * i)
        p5.quad(-8, -13, 8, -13, 3, -25, -3, -25)
        p5.pop()
      }
      p5.noFill()
      p5.strokeWeight(6)
      p5.stroke(...this.SUBJECT_COLORS[2])
      p5.ellipse(30, 150, 30, 30)
      this.subjectIconImages[2] = p5.get(0, sqSize * 2, sqSize, sqSize)

      // math
      p5.clear()
      p5.stroke(0)
      p5.strokeWeight(12)
      p5.line(15, 197, 45, 197)
      p5.line(23, 197, 15, 220)
      p5.bezier(38, 197, 28, 220, 30, 225, 42, 215)
      // ---
      p5.stroke(...this.SUBJECT_COLORS[3])
      p5.strokeWeight(6)
      p5.line(15, 197, 45, 197)
      p5.line(23, 197, 15, 220)
      p5.bezier(38, 197, 28, 220, 30, 225, 42, 215)
      this.subjectIconImages[3] = p5.get(0, sqSize * 3, sqSize, sqSize)
    },

    // create main background image
    () => {
      const p5 = this.p5
      p5.background(0)
      p5.colorMode(p5.HSB, 255)
      p5.strokeWeight(1)
      p5.noFill()
      for (let i = 0; i < 20; i++) {
        p5.stroke((i * 12) % 255, 255, 100)
        var x = i * 45
        var y = i * -18
        p5.bezier(
          22 + x,
          -3 + y,
          -880 + x,
          813 + y,
          630 + x,
          114 + y,
          -256 + x,
          995 + y
        )
      }
      p5.colorMode(p5.RGB)
      this.backgroundImage = p5.get(0, 0, p5.width, p5.height)
    },

    // create star image (60x60) & card backside
    () => {
      const p5 = this.p5
      p5.clear()
      p5.push()
      p5.translate(330, 30)
      p5.rotate((p5.PI / 2) * 3)

      const angle = p5.TWO_PI / 5
      const halfAngle = angle / 2
      const outerR = 27
      const innerR = 15

      // outline
      p5.fill(0)
      p5.strokeWeight(5)
      p5.stroke(0)
      p5.beginShape()
      for (let i = 0; i < 5; i++) {
        p5.vertex(p5.cos(i * angle) * outerR, p5.sin(i * angle) * outerR)
        p5.vertex(
          p5.cos(i * angle + halfAngle) * innerR,
          p5.sin(i * angle + halfAngle) * innerR
        )
      }
      p5.endShape(p5.CLOSE)
      // inner fill
      p5.noStroke()
      for (let i = 0; i < 5; i++) {
        let outer1 = [p5.cos(i * angle) * outerR, p5.sin(i * angle) * outerR]
        let inner = [
          p5.cos(i * angle + halfAngle) * innerR,
          p5.sin(i * angle + halfAngle) * innerR,
        ]
        let outer2 = [
          p5.cos((i + 1) * angle) * outerR,
          p5.sin((i + 1) * angle) * outerR,
        ]

        // Triangle 1
        p5.fill(225, 225, 15)
        p5.triangle(outer1[0], outer1[1], inner[0], inner[1], 0, 0)
        // Triangle 2
        p5.fill(255, 255, 100)
        p5.triangle(inner[0], inner[1], outer2[0], outer2[1], 0, 0)
      }
      p5.pop()
      this.starImage = p5.get(p5.width / 2, 0, p5.width * 0.1, p5.width * 0.1)

      // card backside
      const subjectColor = p5.color(150)
      const cardBgColor = p5.lerpColor(
        p5.color(subjectColor),
        p5.color(this.GRAY_COLOR),
        0.7
      )

      // bg fill
      p5.noStroke()
      p5.fill(cardBgColor)
      p5.rect(50, 80, 95, 155, 20)

      // corner fill
      p5.fill(subjectColor)
      p5.rect(20, 20, 35, 30, 15)
      p5.rect(80, 140, 35, 30, 15)

      // bg arcs
      p5.strokeCap(p5.SQUARE)
      p5.noFill()
      p5.strokeWeight(12)
      for (let ai = 0; ai < 8; ai++) {
        p5.stroke(
          p5.lerpColor(
            p5.color(subjectColor),
            p5.color(cardBgColor),
            (ai + 1) * 0.118
          )
        )
        p5.arc(
          3,
          3,
          60 + 10 * ai + 10 * (ai >> 1),
          40 + 20 * ai - 10 * (ai >> 1),
          0,
          1.58
        )
        p5.arc(
          97,
          157,
          60 + 10 * ai + 10 * (ai >> 1),
          40 + 20 * ai - 10 * (ai >> 1),
          3.14,
          4.72
        )
      }
      p5.strokeCap(p5.ROUND)
      p5.image(this.starImage, 50, 80, 50, 50)

      // darkening rect
      p5.noFill()
      for (let ri = 1; ri < 5; ri++) {
        p5.strokeWeight(6 - 0.5 * ri)
        p5.stroke(0, ri * 40)
        p5.rect(50, 80, 85 + 2 * ri, 145 + 2 * ri, 20)
      }

      // boundary
      p5.noFill()
      p5.strokeWeight(2.5)
      p5.stroke(p5.lerpColor(subjectColor, p5.color(0), 0.5))
      p5.rect(50, 80, 97, 157, 20)
      p5.strokeWeight(2)
      p5.stroke(p5.lerpColor(subjectColor, p5.color(0), 0.4))
      p5.rect(50, 80, 94, 154, 20)
      this.cardBackside = p5.get(0, 0, p5.width / 6, (p5.width / 600) * 160)
    },

    ///  projectBgs + white, other texts
  ]

  constructor(gameClient: GameClient) {
    this.gc = gameClient
  }

  private createCardImage() {
    const p5 = this.p5
    p5.clear()
    // card size: 100 x 160
    const cardIndex = this.cardImages.length
    const oc = originalCards[cardIndex]
    const subjectColor = p5.color(...this.SUBJECT_COLORS[oc.subject])
    const cardBgColor = p5.lerpColor(
      p5.color(subjectColor),
      p5.color(this.GRAY_COLOR),
      0.7
    )

    // bg fill
    p5.noStroke()
    p5.fill(cardBgColor)
    p5.rect(50, 80, 95, 155, 20)

    // corner fill
    p5.fill(subjectColor)
    p5.rect(20, 20, 35, 30, 15)
    p5.rect(80, 140, 35, 30, 15)

    // bg arcs
    p5.strokeCap(p5.SQUARE)
    p5.noFill()
    p5.strokeWeight(12)
    for (let ai = 0; ai < 8; ai++) {
      p5.stroke(
        p5.lerpColor(
          p5.color(subjectColor),
          p5.color(cardBgColor),
          (ai + 1) * 0.118
        )
      )
      p5.arc(
        3,
        3,
        60 + 10 * ai + 10 * (ai >> 1),
        40 + 20 * ai - 10 * (ai >> 1),
        0,
        1.58
      )
      p5.arc(
        97,
        157,
        60 + 10 * ai + 10 * (ai >> 1),
        40 + 20 * ai - 10 * (ai >> 1),
        3.14,
        4.72
      )
    }
    p5.strokeCap(p5.ROUND)

    // avatar
    p5.image(
      this.gc.avatarSheet!,
      50,
      70,
      85,
      85,
      200 * (cardIndex % 4),
      200 * p5.floor(cardIndex / 4),
      200,
      200
    )

    // name
    const nameHalfWidth =
      customFont.render(oc.name, -200, -200, 12, p5.color(0, 0), p5) / 2
    customFont.render(
      oc.name,
      50 - nameHalfWidth + 2,
      120 + 1,
      12,
      p5.color(0),
      p5
    )
    customFont.render(oc.name, 50 - nameHalfWidth, 120, 12, p5.color(250), p5)

    // ability
    this.renderAbilityIcon(oc, 50, 138, 0.5)

    // darkening rect
    p5.noFill()
    for (let ri = 1; ri < 5; ri++) {
      p5.strokeWeight(6 - 0.5 * ri)
      p5.stroke(0, ri * 40)
      p5.rect(50, 80, 85 + 2 * ri, 145 + 2 * ri, 20)
    }

    // boundary
    p5.noFill()
    p5.strokeWeight(2.5)
    p5.stroke(p5.lerpColor(subjectColor, p5.color(0), 0.5))
    p5.rect(50, 80, 97, 157, 20)
    p5.strokeWeight(2)
    p5.stroke(p5.lerpColor(subjectColor, p5.color(0), 0.4))
    p5.rect(50, 80, 94, 154, 20)
    this.cardImages.push(p5.get(0, 0, p5.width / 6, (p5.width / 600) * 160))
  }

  // used when creating card images & rendering ability description
  public renderAbilityIcon(oc: OriginalCard, x: number, y: number, s: number) {
    const p5 = this.p5
    p5.push()
    p5.translate(x, y)
    p5.scale(s)
    switch (oc.ability) {
      // by name
      case 0:
        p5.image(this.subjectIconImages[0], 0, 0, 50, 50)
        break
      // by body
      case 1:
        p5.image(this.subjectIconImages[1], 0, 0, 50, 50)
        break
      // by gender
      case 2:
        p5.image(this.subjectIconImages[2], 0, 0, 50, 50)
        break
      // by subject
      case 3:
        p5.image(this.subjectIconImages[3], 0, 0, 50, 50)
        break
      // by random
      case 4:
        p5.image(this.subjectIconImages[0], 0, 0, 50, 50)
        break
    }
    p5.pop()
  }

  public update() {
    // create other images with functions in list
    if (this.imagesCreateFunctions.length > 0) {
      this.imagesCreateFunctions.shift()!()
      return
    }

    // create card images if not done yet
    if (this.cardImages.length < 32) {
      // stall to make sure the images are loaded
      //$ if (this.p5.frameCount < 100) { return }
      this.createCardImage()
      return
    }

    // all done
    this.isLoaded = true
  }

  public draw() {
    const p5 = this.p5

    p5.background(50, 50, 0)
    // p5.scale(3.5) ////

    if (this.backgroundImage) p5.image(this.backgroundImage, 300, 300, 600, 600)

    const cardIndex = p5.floor(p5.frameCount * 0.02) % 32
    const cimg = this.cardImages[cardIndex]
    if (cimg) {
      for (let i = 0; i < 6; i++) {
        p5.image(cimg, 75 + i * 90, 500, 100, 160)
      }
    }

    p5.stroke(250)
    p5.fill(0)
    for (let i = 0; i < 4; i++) {
      // 250 x 70
      p5.rect(170, 60 + i * 90, 300, 70, 100)
    }

    customFont.render(
      "engineering",
      45,
      55,
      16,
      p5.color(...this.SUBJECT_COLORS[0]),
      p5
    )

    if (this.starImage) {
      p5.image(this.cardBackside, this.gc.mx, this.gc.my - 60, 100, 160)
    }

    /// animated spinner
  }
}
