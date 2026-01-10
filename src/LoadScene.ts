import type P5 from "p5"
import { customFont } from "./font"
import originalCards, { OriginalCard } from "./originalCards"
import GameClient from "./main"

export default class LoadScene {
  gc: GameClient
  p5!: P5
  isLoaded: boolean = false

  starImage!: P5.Image
  cardBackside!: P5.Image[]
  subjectIconImages: P5.Image[] = []
  projectPanelImages: P5.Image[] = []
  cardImages: P5.Image[] = []

  readonly SUBJECT_COLORS: [number, number, number][] = [
    [60, 235, 155], // green
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
      p5.strokeWeight(6)

      // science
      p5.clear()
      p5.stroke(...this.SUBJECT_COLORS[0])
      p5.square(30, 30, 50)
      this.subjectIconImages[0] = p5.get(0, 0, sqSize, sqSize)

      // tech
      p5.clear()
      p5.stroke(...this.SUBJECT_COLORS[1])
      p5.square(30, 90, 50)
      this.subjectIconImages[1] = p5.get(0, sqSize, sqSize, sqSize)

      // engineer
      p5.clear()
      p5.stroke(...this.SUBJECT_COLORS[2])
      p5.square(30, 150, 50)
      this.subjectIconImages[2] = p5.get(0, sqSize * 2, sqSize, sqSize)

      // math
      p5.clear()
      p5.stroke(...this.SUBJECT_COLORS[3])
      p5.square(30, 210, 50)
      this.subjectIconImages[3] = p5.get(0, sqSize * 3, sqSize, sqSize)
    },

    /// star, cardBackside, projectPanels, other texts
  ]

  constructor(gameClient: GameClient) {
    this.gc = gameClient
  }

  private createCardImage() {
    const p5 = this.p5

    ///  this.cardImages.push(p5.get())
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

    p5.background(10)
    p5.scale(3.5) ////

    // card size: 100 x 160
    const cardIndex = p5.floor(p5.frameCount * 0.02) % 32
    const oc = originalCards[cardIndex]
    const subjectColor = p5.color(...this.SUBJECT_COLORS[oc.subject])
    const cardBgColor = p5.lerpColor(
      p5.color(subjectColor),
      p5.color(this.GRAY_COLOR),
      0.85
    )

    // bg fill
    p5.noStroke()
    p5.fill(cardBgColor)
    p5.rect(50, 80, 95, 155, 20)

    // top left corner fill
    p5.fill(subjectColor)
    p5.rect(25, 20, 45, 35, 15)

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
    }
    p5.strokeCap(p5.ROUND)

    // avatar
    p5.image(
      this.gc.avatarSheet!,
      50,
      72,
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

    // power ///
    customFont.render("123", 15, 35, 20, p5.color(0), p5)
    customFont.render("123", 13, 33, 20, p5.color(250), p5)

    // boundary
    p5.noFill()
    p5.strokeWeight(2.5)
    p5.stroke(p5.lerpColor(subjectColor, p5.color(0), 0.5))
    p5.rect(50, 80, 97, 157, 20)
    p5.strokeWeight(2)
    p5.stroke(p5.lerpColor(subjectColor, p5.color(0), 0.4))
    p5.rect(50, 80, 94, 154, 20)

    /// animated spinner
  }
}
