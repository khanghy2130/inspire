import type P5 from "p5"
import GameClient, {
  easeInOutBack,
  easeOutBack,
  easeOutCubic,
  easeOutElastic,
} from "./main"
import { customFont } from "./font"
import LoadScene from "./LoadScene"
import originalCards, { OriginalCard } from "./originalCards"

type PlayingCard = {
  oc: OriginalCard
  power: number
  imageData: P5.Image
}

type Project = {
  subject: SubjectType
  hp: number
  maxHp: number
  spawnPrg: number // 0 to 1: slide; 1 to 2: HP up
  moveUpPrg: number
}

type SelectableCard = {
  isSelected: boolean
  outlinePrg: number
  moveUpPrg: number
  starPrg: number
  slideAmount: number // 0 is same position
}

type SelectController = {
  selectableCards: SelectableCard[]
  starIndices: number[]
  hoveredIndex: number | null
  discardPrg: number | null // not discarding if is null
  controlSectionPrg: number
  previousSelectedCount: number

  inspireInfo: {
    state: "laser" | "taker"
    prg: number
    takerIndices: number[]
    hasBuffed: boolean
    projectIsCompleted: boolean
  } | null

  assignInfo: {
    projectIsCompleted: boolean
    isGoingToHit: boolean
    curDist: number
    dir: number
    dist: number
  } | null

  discardClicked: () => void
  assignClicked: () => void
  getInspiredIndices: (indexInHand: number) => number[]
  isNotActionable: () => boolean
  renderControlSection: () => void
  renderHoverPopup: () => void
}

type StatsController = {
  bouncePrg: number
  energy: number
  completedAmount: number
  render: () => void
}

type ProjectController = {
  readonly Y_POSITONS: number[] // X value is always 150
  readonly NAMES: ["science", "technology", "engineering", "math"]
  readonly ARC_TABLE: [number, number, number, number, number, number][]
  projectMaxHP: number
  queue: Project[]

  hitController: {
    target: {
      project: Project
      previousHP: number
      squishPrg: number
      squishStrength: number
      drainPrg: number // starts at negative to delay, also apply to flasher
      isCompleted: boolean
      isPerfect: boolean
    } | null

    // update energy & completedAmount on removed
    laser: {
      isPerfect: boolean
      prg: number
      // x,y,w,h, startAngle, endAngle
      arcInfo: [number, number, number, number, number, number]
    } | null

    // independently updated and removed with no side effect
    flyer: {
      subject: SubjectType
      pos: PositionType
      vel: PositionType
      rotation: number
      rotationVel: number // gets smaller
    } | null
  }
  add: (subject: SubjectType) => void
  damage: (subject: SubjectType, hitAmount: number) => void
  renderProjects: () => void
  renderFlyer: () => void
  renderLaser: () => void
}

type DeckController = {
  cards: Record<
    "drawPile" | "discardPile" | "hand" | "selectedCards",
    PlayingCard[]
  >
  drawPrgs: number[]
  delay: number
  isDrawing: boolean
  flyers: number[] // prg[]
  displayPileCount: number
  startDrawing: (delay: number) => void
  // render draw pile & flyers & drawn cards
  renderDrawPile: () => void
  renderInspireLasers: () => void
  renderHand: () => void
}

export default class PlayScene {
  gc: GameClient
  p5!: P5
  loadScene!: LoadScene

  screenShakePrg: number = 1
  screenShakeStrength: number = 0
  gameIsOver: boolean = false
  checkGameIsOver: () => boolean = () => {
    return (
      this.statsController.energy === 0 ||
      this.statsController.completedAmount === 20
    )
  }

  statsController: StatsController = {
    bouncePrg: 1,
    energy: 0,
    completedAmount: 0,
    render: () => {
      const p5 = this.p5
      const statsController = this.statsController
      if (statsController.bouncePrg < 1) {
        if (statsController.bouncePrg < 0.08) {
          statsController.bouncePrg = 0.08
        } else {
          statsController.bouncePrg = p5.min(
            statsController.bouncePrg + 0.005,
            1,
          )
        }
      }
      let scaleFactor = easeOutElastic(statsController.bouncePrg)

      p5.push()
      p5.translate(460, 75 - scaleFactor * 30)
      scaleFactor *= 0.5 // animated range
      p5.scale(0.5 + scaleFactor, 1.5 - scaleFactor)

      p5.noStroke()
      p5.fill(40, 90, 150)
      p5.rect(-60, 0, 120, 50, 15, 0, 0, 15)
      p5.fill(30, 120, 30)
      p5.rect(60, 0, 120, 50, 0, 15, 15, 0)

      const energy = this.statsController.energy + ""
      const completedAmount = this.statsController.completedAmount + ""

      customFont.render(
        energy,
        -40 - customFont.getNumHalfWidth(energy, 30),
        16,
        30,
        p5.color(200),
        p5,
      )
      customFont.render(
        completedAmount,
        40 - customFont.getNumHalfWidth(completedAmount, 30),
        16,
        30,
        p5.color(200),
        p5,
      )

      p5.strokeWeight(8)
      p5.stroke(45, 185, 80)
      p5.line(82, 3, 90, 12)
      p5.line(100, -10, 90, 12)

      p5.stroke(35, 165, 225)
      p5.line(-86, 0, -93, 12)
      p5.line(-86, 0, -100, 0)
      p5.line(-100, 0, -93, -12)

      p5.pop()
    },
  }

  projectController: ProjectController = {
    // X position is 150
    Y_POSITONS: [55, 140, 225, 310],
    NAMES: ["science", "technology", "engineering", "math"],
    ARC_TABLE: [
      // x,y,w,h, end angle, start angle
      [305, 50, 310, 330, 0, Math.PI],
      [300, 50, 320, 440, 0, Math.PI - 0.6],
      [280, 50, 360, 550, 0, Math.PI - 0.95],
      [270, 50, 380, 660, 0, Math.PI - 1.15],
    ],
    projectMaxHP: 10,
    queue: [],
    hitController: {
      target: null,
      laser: null,
      flyer: null,
    },
    add: (subject) => {
      const projectController = this.projectController
      const maxHp = projectController.projectMaxHP
      projectController.projectMaxHP += 5 // increase
      projectController.queue.push({
        subject,
        hp: maxHp,
        maxHp: maxHp,
        // at beginning? apply delay
        spawnPrg:
          this.statsController.completedAmount === 0
            ? -projectController.queue.length * 0.2
            : -1,
        moveUpPrg: 1,
      })
    },
    // no safe exit
    damage: (subject, hitAmount) => {
      const p5 = this.p5
      const projectController = this.projectController
      const queue = projectController.queue
      let project!: Project
      for (let i = 0; i < queue.length; i++) {
        if (queue[i].subject === subject) {
          project = queue[i]
          break
        }
      }

      const isPerfect = hitAmount === project.hp
      const isCompleted = hitAmount >= project.hp
      const previousHP = project.hp
      project.hp = this.p5.max(project.hp - hitAmount, 0)

      // set up target
      projectController.hitController.target = {
        project,
        previousHP,
        squishPrg: 0,
        squishStrength: p5.constrain(hitAmount / project.maxHp, 0.2, 1),
        drainPrg: -1,
        isCompleted,
        isPerfect,
      }
      // pass to assignInfo
      if (this.selectController.assignInfo) {
        this.selectController.assignInfo.projectIsCompleted = isCompleted
      }

      this.screenShakePrg = 0 // trigger screen shake
      this.screenShakeStrength = hitAmount / project.maxHp
    },
    renderProjects: () => {
      const p5 = this.p5
      const projectController = this.projectController
      const queue = projectController.queue
      const target = projectController.hitController.target
      let { projectGraphics, renderProjectGraphics } = this.loadScene
      let doesRemoveTarget = false

      // all projects
      const whiteColor = p5.color(250)
      const blackColor = p5.color(0)
      for (let i = 0; i < queue.length; i++) {
        const project = queue[i]

        const isTarget = target && target.project === project
        // squishing?
        if (isTarget && target.squishPrg < 1) {
          target.squishPrg += 0.02
          const f =
            p5.sin(target.squishPrg * p5.PI) * target.squishStrength * 0.5 // adjustible squishiness
          p5.noStroke()
          p5.fill(target.isPerfect ? p5.color(255, 255, 0) : p5.color(255))
          p5.rect(
            150,
            projectController.Y_POSITONS[queue.indexOf(project)],
            280 * (1 + f),
            70 * (1 - f),
            100,
          )
          continue
        }

        // update animation progresses
        project.spawnPrg = p5.min(project.spawnPrg + 0.016, 2)
        project.moveUpPrg = p5.min(project.moveUpPrg + 0.02, 1)

        const _x = (1 - easeOutCubic(p5.min(project.spawnPrg, 1))) * -300 + 10
        const _y = (1 - easeOutCubic(project.moveUpPrg)) * 85 + (20 + 85 * i)

        // spawning & normal
        const hpFactor =
          project.spawnPrg < 2
            ? easeOutCubic(p5.max(project.spawnPrg - 1, 0))
            : (1 / project.maxHp) * project.hp

        // dark panel
        renderProjectGraphics(
          projectGraphics.dark[project.subject],
          0,
          0,
          280,
          70,
          _x,
          _y,
          280,
          70,
          p5,
        )

        // light panel
        if (hpFactor > 0) {
          renderProjectGraphics(
            projectGraphics.light[project.subject],
            0,
            0,
            280 * hpFactor,
            70,
            _x,
            _y,
            280 * hpFactor,
            70,
            p5,
          )
        }

        // white panel (being damaged)
        if (isTarget) {
          target.drainPrg += 0.02
          // finish draining? REMOVE target
          if (target.drainPrg >= 1) {
            doesRemoveTarget = true
          }
          // update damaging animation
          else {
            const whiteX = (1 / project.maxHp) * project.hp * 280
            let whiteWidth =
              (1 / project.maxHp) * target.previousHP * 280 - whiteX
            whiteWidth =
              whiteWidth * (1 - easeOutCubic(p5.max(target.drainPrg, 0)))
            renderProjectGraphics(
              projectGraphics.white,
              whiteX,
              0,
              whiteWidth,
              70,
              10 + whiteX,
              20 + 85 * i,
              whiteWidth,
              70,
              p5,
            )

            // flasher
            const flashOpacity = p5.map(target.drainPrg, -1, -0.8, 255, 0)
            if (flashOpacity > 0) {
              p5.noStroke()
              p5.fill(
                target.isPerfect
                  ? p5.color(255, 255, 0, flashOpacity)
                  : p5.color(255, flashOpacity),
              )
              p5.rect(
                150,
                projectController.Y_POSITONS[queue.indexOf(project)],
                280,
                70,
                100,
              )
            }
          }
        }

        p5.image(
          this.loadScene.subjectIconImages[project.subject],
          _x + 30,
          _y + 19,
          25,
          25,
        )

        // subject name
        customFont.render(
          projectController.NAMES[project.subject],
          _x + 48,
          _y + 27,
          14,
          blackColor,
          p5,
        )
        customFont.render(
          projectController.NAMES[project.subject],
          _x + 46,
          _y + 25,
          14,
          whiteColor,
          p5,
        )

        // hp display number is real hp + draining if is hit target (spawning & normal)
        const displayHP = p5.round(
          project.spawnPrg < 2
            ? project.maxHp * easeOutCubic(p5.max(project.spawnPrg - 1, 0))
            : project.hp +
                (isTarget
                  ? (target.previousHP - project.hp) *
                    (1 - easeOutCubic(p5.max(target.drainPrg, 0)))
                  : 0),
        )

        const hpX = _x + 230 - customFont.getNumHalfWidth(displayHP + "", 26)
        customFont.render(displayHP + "", hpX + 2, _y + 65, 26, blackColor, p5)
        customFont.render(displayHP + "", hpX, _y + 63, 26, whiteColor, p5)
      }

      if (doesRemoveTarget && target) {
        // target project is completed?
        if (target.isCompleted) {
          const i = queue.indexOf(target.project)
          // move below projects up
          for (let j = i + 1; j < queue.length; j++) {
            queue[j].moveUpPrg = 0
          }
          queue.splice(i, 1) // remove old project
          // add new project
          projectController.add(target.project.subject)

          // spawn flyer
          projectController.hitController.flyer = {
            subject: target.project.subject,
            pos: [150, projectController.Y_POSITONS[i]],
            vel: [p5.random() * 4 + 1, -(p5.random() * 3 + 12)],
            rotation: 0,
            rotationVel: p5.random() * 0.03 + 0.1,
          }

          // spawn laser
          projectController.hitController.laser = {
            isPerfect: target.isPerfect,
            arcInfo: projectController.ARC_TABLE[i],
            prg: 0,
          }
        }
        // remove target
        projectController.hitController.target = null
      }
    },
    renderFlyer: () => {
      const p5 = this.p5
      const flyer = this.projectController.hitController.flyer
      if (!flyer) {
        return
      }
      const flyerGraphics = this.loadScene.projectGraphics.dark[flyer.subject]

      // update
      flyer.pos[0] += flyer.vel[0]
      flyer.pos[1] += flyer.vel[1]
      flyer.vel[1] += 0.5 // gravity
      flyer.rotation += flyer.rotationVel
      flyer.rotationVel = p5.max(flyer.rotationVel - 0.001, 0)
      if (flyer.pos[1] > 750) {
        this.projectController.hitController.flyer = null // remove
      }

      p5.push()
      p5.translate(flyer.pos[0], flyer.pos[1])
      p5.rotate(flyer.rotation)
      p5.image(flyerGraphics, 0, 0, 280, 70)
      p5.pop()
    },
    renderLaser: () => {
      const p5 = this.p5
      const laser = this.projectController.hitController.laser
      if (!laser) {
        return
      }
      laser.prg = p5.min(laser.prg + 0.01, 1)
      if (laser.prg === 1) {
        this.projectController.hitController.laser = null
        const statsController = this.statsController
        statsController.energy += 3 + (laser.isPerfect ? 1 : 0)
        statsController.completedAmount++
        statsController.bouncePrg = 0
      }

      const [x, y, w, h, a1, a2] = laser.arcInfo
      p5.noFill()
      p5.strokeWeight(10)
      if (laser.isPerfect) {
        p5.stroke(250, 250, 0)
      } else {
        p5.stroke(250)
      }
      const headAngle = p5.map(p5.min(laser.prg, 0.8), 0, 0.8, a2, a1)
      const tailAngle = p5.map(p5.max(laser.prg, 0.2), 0.2, 1, a2, a1)
      p5.arc(x, y, w, h, headAngle, tailAngle)
    },
  }

  deckController: DeckController = {
    cards: {
      drawPile: [],
      discardPile: [],
      hand: [],
      selectedCards: [],
    },
    drawPrgs: [],
    delay: 0,
    isDrawing: false,
    flyers: [],
    displayPileCount: 0,
    startDrawing: (delay) => {
      this.deckController.isDrawing = true
      this.deckController.displayPileCount = 0
      this.deckController.flyers = []
      this.deckController.delay = delay
    },
    renderDrawPile: () => {
      const p5 = this.p5
      const cardBackside = this.loadScene.cardBackside
      const deckController = this.deckController
      const cards = deckController.cards
      let pileCount = cards.drawPile.length

      // update
      if (deckController.isDrawing && deckController.delay-- < 0) {
        deckController.delay = 10 // reset delay
        // not shuffling?
        if (deckController.flyers.length === 0) {
          // empty draw pile? start shuffling by adding flyers
          if (cards.drawPile.length === 0) {
            deckController.flyers = []
            for (let fi = 0; fi < cards.discardPile.length; fi++) {
              deckController.flyers.push(0 - fi * 0.05) // delay between flyers
            }
          }
          // hand not full? draw
          else if (cards.hand.length < 6) {
            const pickedCard = cards.drawPile.splice(
              p5.random() * cards.drawPile.length,
              1,
            )[0]
            cards.hand.push(pickedCard)
            deckController.drawPrgs.push(0)
          }
          // hand full? stop
          else {
            deckController.isDrawing = false
          }
        }
      }

      // render draw pile backside
      if (pileCount > 0 || deckController.displayPileCount > 0) {
        p5.image(cardBackside, 530, 180, 100, 160)
      }

      // render cards being drawn
      const backsideImage = this.loadScene.cardBackside
      const whiteColor = p5.color(255)
      const blackColor = p5.color(0)
      for (let di = 0; di < deckController.drawPrgs.length; di++) {
        deckController.drawPrgs[di] += 0.017
        const prg = deckController.drawPrgs[di]

        const handIndex =
          cards.hand.length - deckController.drawPrgs.length + di
        const card = cards.hand[handIndex]

        const flipPrg = easeOutCubic(prg)
        const easedPrg = easeOutBack(prg)
        const x = p5.map(easedPrg, 0, 1, 530, 75 + handIndex * 90)
        const y = p5.map(easedPrg, 0, 1, 180, 500)

        // backside 0 to 0.5
        if (flipPrg < 0.5) {
          p5.image(backsideImage, x, y, 100, 160)
        }
        // 0.5 to 0.75 backside flipping
        else if (flipPrg < 0.75) {
          p5.image(
            backsideImage,
            x,
            y,
            100 * p5.map(flipPrg, 0.5, 0.75, 1, 0),
            160,
          )
        }
        // 0.75 to 1 face side flipping
        else {
          p5.push()
          p5.translate(x, y)
          p5.scale(p5.map(flipPrg, 0.75, 1, 0, 1), 1)
          p5.image(card.imageData, 0, 0, 100, 160)
          /// also render power
          customFont.render(card.power + "", -33, -40, 22, blackColor, p5)
          customFont.render(card.power + "", -35, -42, 22, whiteColor, p5)
          p5.pop()
        }

        // remove
        if (prg >= 1) {
          deckController.drawPrgs.shift()
          di--
        }
      }

      // is shuffling? show dummy count
      if (deckController.flyers.length > 0) {
        pileCount = deckController.displayPileCount
      }

      // render shuffling flyers
      for (let fi = 0; fi < deckController.flyers.length; fi++) {
        let prg = (deckController.flyers[fi] += 0.03) // flyer speed

        // remove
        if (prg >= 1) {
          deckController.flyers.shift()
          fi--
          deckController.displayPileCount += 1
          // done shuffling?
          if (deckController.displayPileCount === cards.discardPile.length) {
            deckController.flyers = []
            cards.drawPile = cards.discardPile
            cards.discardPile = []
            break
          }
        } else if (prg > 0) {
          const rad = p5.map(prg, 0, 1, p5.HALF_PI, p5.PI)
          const x = p5.cos(rad) * 200
          const y = p5.sin(rad) * 100
          p5.image(cardBackside, 730 + x, 180 + y, 100, 160)
        }
      }

      // render pile count
      customFont.render("" + pileCount, 480, 260, 22, p5.color(250), p5)
    },

    renderInspireLasers: () => {
      const inspireInfo = this.selectController.inspireInfo
      const selectableCards = this.selectController.selectableCards

      if (inspireInfo && inspireInfo.state === "laser" && inspireInfo.prg > 0) {
        const p5 = this.p5
        let giverX = 0
        for (let i = 0; i < selectableCards.length; i++) {
          if (selectableCards[i].isSelected) {
            giverX = 75 + i * 90
            break
          }
        }
        // lasers
        p5.noFill()
        p5.strokeWeight(10)
        if (inspireInfo.projectIsCompleted) {
          p5.stroke(250, 250, 0)
        } else {
          p5.stroke(250)
        }

        // test all inspire
        // inspireInfo.takerIndices = []
        // for (let za = 0; za < selectableCards.length; za++) {
        //   if (selectableCards[za].isSelected) continue
        //   inspireInfo.takerIndices.push(za)
        // }

        for (let i = 0; i < inspireInfo.takerIndices.length; i++) {
          let takerX = 75 + inspireInfo.takerIndices[i] * 90
          const leftToRight = giverX < takerX

          const x = (giverX + takerX) / 2
          const w = leftToRight ? takerX - giverX : giverX - takerX

          let leftAngle = 0
          let rightAngle = 0
          if (leftToRight) {
            leftAngle = p5.map(
              p5.min(inspireInfo.prg, 0.8),
              0,
              0.8,
              p5.PI,
              p5.TWO_PI,
            )
            rightAngle = p5.map(
              p5.max(inspireInfo.prg, 0.2),
              0.2,
              1,
              p5.PI,
              p5.TWO_PI,
            )
          } else {
            leftAngle = p5.map(
              p5.max(inspireInfo.prg, 0.2),
              0.2,
              1,
              p5.TWO_PI,
              p5.PI,
            )
            rightAngle = p5.map(
              p5.min(inspireInfo.prg, 0.8),
              0,
              0.8,
              p5.TWO_PI,
              p5.PI,
            )
          }
          p5.arc(x, 430, w, 200 + w * 0.4, rightAngle, leftAngle)
        }
      }
    },

    renderHand: () => {
      const p5 = this.p5
      const { mx, my } = this.gc
      const deckController = this.deckController
      const selectController = this.selectController
      const hand = deckController.cards.hand

      // set hoveredIndex (if actionable, if within y)
      selectController.hoveredIndex = null
      if (!selectController.isNotActionable()) {
        if (my > 500 - 110 && my < 500 + 80) {
          for (let hi = 0; hi < hand.length; hi++) {
            const x = 75 + hi * 90
            if (mx >= x - 45 && mx <= x + 45) {
              this.selectController.hoveredIndex = hi
              p5.cursor(p5.HAND)
              break
            }
          }
        }
      }

      // set starIndices
      if (selectController.hoveredIndex !== null) {
        selectController.starIndices = selectController.getInspiredIndices(
          selectController.hoveredIndex,
        )
      } else {
        selectController.starIndices = []
      }

      // update discardPrg
      if (selectController.discardPrg !== null) {
        selectController.discardPrg += 0.02
        // done discarding?
        if (selectController.discardPrg >= 1) {
          selectController.discardPrg = null
          // loop through selectableCards
          for (
            let i = selectController.selectableCards.length - 1;
            i >= 0;
            i--
          ) {
            const sCard = selectController.selectableCards[i]

            // add card to discard pile & remove from hand
            if (sCard.isSelected) {
              sCard.isSelected = false
              const card = deckController.cards.hand[i]
              deckController.cards.discardPile.push(card)
              deckController.cards.hand.splice(i, 1)
            }

            sCard.moveUpPrg = 0
            sCard.slideAmount = 0
          }
          // trigger draw
          deckController.startDrawing(0)
        }
      }

      // update inspire prg
      let inspireInfo = selectController.inspireInfo
      if (inspireInfo) {
        // laser prg speed? else card flip speed
        if (inspireInfo.state === "laser") {
          deckController.renderInspireLasers()
          inspireInfo.prg += 0.015
          inspireInfo.prg = Math.round(inspireInfo.prg * 100000) / 100000
        } else {
          inspireInfo.prg += 0.02
        }
        // apply power buff (at precisely prg 0.75 & not already buffed)
        if (
          inspireInfo.state === "taker" &&
          inspireInfo.prg >= 0.75 &&
          !inspireInfo.hasBuffed
        ) {
          inspireInfo.hasBuffed = true
          for (let i = 0; i < inspireInfo.takerIndices.length; i++) {
            hand[inspireInfo.takerIndices[i]].power +=
              inspireInfo.projectIsCompleted ? 10 : 5
          }
        }
        if (inspireInfo.prg >= 1) {
          // next state?
          inspireInfo.prg = 0
          if (inspireInfo.state === "laser") {
            inspireInfo.state = "taker"
          } else if (inspireInfo.state === "taker") {
            selectController.inspireInfo = null
            inspireInfo = null // clear local as well
            selectController.discardClicked()
            this.statsController.energy++ // compensate for using discard
          }
        }
      }

      const rLength = hand.length - deckController.drawPrgs.length
      const whiteColor = p5.color(255)
      const blackColor = p5.color(0)
      for (let i = 0; i < rLength; i++) {
        const card = hand[i]
        const selectableCard = selectController.selectableCards[i]

        // update outlinePrg
        if (selectController.hoveredIndex === i) {
          selectableCard.outlinePrg = p5.min(
            selectableCard.outlinePrg + 0.15,
            1,
          )
        } else {
          selectableCard.outlinePrg = p5.max(
            selectableCard.outlinePrg - 0.15,
            0,
          )
        }

        // update moveUpPrg
        if (selectableCard.isSelected) {
          selectableCard.moveUpPrg = p5.min(selectableCard.moveUpPrg + 0.15, 1)
        } else {
          selectableCard.moveUpPrg = p5.max(selectableCard.moveUpPrg - 0.15, 0)
        }

        // update starPrg
        if (selectController.starIndices.includes(i)) {
          selectableCard.starPrg = p5.min(selectableCard.starPrg + 0.2, 1)
        } else {
          selectableCard.starPrg = p5.max(selectableCard.starPrg - 0.2, 0)
        }

        p5.push()
        // being discarded animation
        const discardYOffset =
          selectController.discardPrg !== null && selectableCard.isSelected
            ? easeOutCubic(selectController.discardPrg) * 240
            : 0
        // being slided animation
        const discardXOffset =
          selectController.discardPrg === null
            ? 0
            : easeInOutBack(selectController.discardPrg) *
              selectableCard.slideAmount *
              90
        p5.translate(
          75 + i * 90 + discardXOffset,
          500 - selectableCard.moveUpPrg * 30 + discardYOffset,
        )

        // hitting transformation
        if (selectController.assignInfo !== null && selectableCard.isSelected) {
          const assignInfo = selectController.assignInfo
          // update curDist
          const speed = 4 + assignInfo.dist * 0.018 // bonus speed for longer dist
          if (assignInfo.isGoingToHit) {
            // slower speed if is squishing
            if (assignInfo.dist - assignInfo.curDist < 40) {
              assignInfo.curDist = p5.min(
                assignInfo.curDist + 3,
                assignInfo.dist,
              )
            } else {
              assignInfo.curDist = p5.min(
                assignInfo.curDist + speed,
                assignInfo.dist,
              )
            }
            // start damage (if currently no target)
            if (
              assignInfo.curDist >= assignInfo.dist - 40 &&
              !this.projectController.hitController.target
            ) {
              this.projectController.damage(card.oc.subject, card.power)
            }
            // go back
            else if (assignInfo.curDist >= assignInfo.dist) {
              assignInfo.isGoingToHit = false
            }
          } else {
            // slower speed if is squishing
            if (assignInfo.dist - assignInfo.curDist < 40) {
              assignInfo.curDist = p5.max(assignInfo.curDist - 3, 0)
            } else {
              assignInfo.curDist = p5.max(assignInfo.curDist - speed, 0)
            }
            // back to 0? done
            if (assignInfo.curDist <= 0) {
              selectController.assignInfo = null

              const takerIndices = selectController.getInspiredIndices(i)
              // trigger inspire if there are takers
              if (takerIndices.length > 0) {
                selectController.inspireInfo = {
                  projectIsCompleted: assignInfo.projectIsCompleted,
                  hasBuffed: false,
                  state: "laser",
                  prg: 0,
                  takerIndices: takerIndices,
                }
              } else {
                // skip inspire
                selectController.discardClicked()
                this.statsController.energy++ // compensate for using discard
              }
            }
          }

          p5.translate(
            p5.cos(assignInfo.dir) * assignInfo.curDist,
            p5.sin(assignInfo.dir) * assignInfo.curDist,
          )
          p5.rotate(
            ((assignInfo.dir + p5.HALF_PI) / assignInfo.dist) *
              assignInfo.curDist,
          )
          const scaleFactor =
            p5.min((assignInfo.dist - assignInfo.curDist) / 40, 1) * 0.5
          p5.scale(1.5 - scaleFactor, 0.5 + scaleFactor)
        }

        // inspiring transformation (if is inspiring)
        if (inspireInfo) {
          // is giver
          if (inspireInfo.state === "laser" && selectableCard.isSelected) {
            // pulse
            const s =
              p5.sin(p5.map(p5.min(inspireInfo.prg, 0.3), 0, 0.3, 0, p5.PI)) *
                0.1 +
              1
            p5.scale(s, s)
          }
          // is taker?
          else if (
            inspireInfo.state === "taker" &&
            inspireInfo.takerIndices.includes(i)
          ) {
            const doubleFlipPrg = inspireInfo.prg
            // closing face up 0 - 0.25
            if (doubleFlipPrg < 0.25) {
              p5.scale(p5.map(doubleFlipPrg, 0, 0.25, 1, 0), 1)
            }
            // opening back 0.25 - 0.5
            else if (doubleFlipPrg < 0.5) {
              p5.image(
                this.loadScene.cardBackside,
                0,
                0,
                100 * p5.map(doubleFlipPrg, 0.25, 0.5, 0, 1),
                160,
              )
              p5.pop() // early pop
              continue
            }
            // closing back 0.5 - 0.75
            else if (doubleFlipPrg < 0.75) {
              p5.image(
                this.loadScene.cardBackside,
                0,
                0,
                100 * p5.map(doubleFlipPrg, 0.5, 0.75, 1, 0),
                160,
              )
              p5.pop() // early pop
              continue
            }
            // opening face up 0.75 - 1
            else if (doubleFlipPrg < 1) {
              p5.scale(p5.map(doubleFlipPrg, 0.75, 1, 0, 1), 1)
            }
          }
        }

        // render outline
        if (selectableCard.outlinePrg > 0) {
          p5.noFill()
          p5.stroke(250)
          p5.strokeWeight(selectableCard.outlinePrg * 5)
          p5.rect(0, 0, 100, 160, 20)
        }

        // render card image
        p5.image(card.imageData, 0, 0, 100, 160)

        // render power
        customFont.render(card.power + "", -33, -40, 22, blackColor, p5)
        customFont.render(card.power + "", -35, -42, 22, whiteColor, p5)

        // render star
        const starSize = selectableCard.starPrg * 30
        if (starSize > 0) {
          p5.image(this.loadScene.starImage, 0, -100, starSize, starSize)
        }

        p5.pop()
      }
    },
  }

  selectController: SelectController = {
    selectableCards: [],
    starIndices: [],
    hoveredIndex: null,
    discardPrg: null,
    controlSectionPrg: 0,
    previousSelectedCount: 0,
    inspireInfo: null,
    assignInfo: null,
    discardClicked: () => {
      const selectController = this.selectController
      selectController.discardPrg = 0
      this.statsController.energy--
      // set slideAmount
      const copy = selectController.selectableCards
        .slice()
        .filter((c) => !c.isSelected)
      for (let j = 0; j < selectController.selectableCards.length; j++) {
        const sCard = selectController.selectableCards[j]
        const index = copy.indexOf(sCard)
        if (index !== -1) {
          sCard.slideAmount = index - j
        }
      }
    },
    assignClicked: () => {
      const p5 = this.p5
      this.statsController.energy--

      let selectedIndex!: number
      for (let i = 0; i < this.selectController.selectableCards.length; i++) {
        if (this.selectController.selectableCards[i].isSelected) {
          selectedIndex = i
          break
        }
      }
      const assignedCard = this.deckController.cards.hand[selectedIndex]

      let projectIndex!: number
      for (let j = 0; j < this.projectController.queue.length; j++) {
        if (
          this.projectController.queue[j].subject === assignedCard.oc.subject
        ) {
          projectIndex = j
          break
        }
      }

      const startPos: PositionType = [75 + selectedIndex * 90, 470] // 500 - 30 = 470
      const endPos: PositionType = [
        150,
        this.projectController.Y_POSITONS[projectIndex],
      ]

      this.selectController.assignInfo = {
        projectIsCompleted: false,
        isGoingToHit: true,
        curDist: 0,
        dir: p5.atan2(endPos[1] - startPos[1], endPos[0] - startPos[0]),
        dist: p5.dist(startPos[0], startPos[1], endPos[0], endPos[1]) - 40, // subtract by 25% of card height
      }
    },
    getInspiredIndices: (indexInHand) => {
      const indices: number[] = []

      const hand = this.deckController.cards.hand
      const card = hand[indexInHand]
      const ability = card.oc.ability

      if (ability === 0) {
        // byName
        for (let i = 0; i < hand.length; i++) {
          if (i === indexInHand) {
            continue
          }
          if (hand[i].oc.name[0] === card.oc.name[0]) {
            indices.push(i)
          }
        }
      } else if (ability === 1) {
        // byBody
        for (let i = 0; i < hand.length; i++) {
          if (i === indexInHand) {
            continue
          }
          if (hand[i].oc.body === card.oc.body) {
            indices.push(i)
          }
        }
      } else if (ability === 2) {
        // byGender
        for (let i = 0; i < hand.length; i++) {
          if (i === indexInHand) {
            continue
          }
          if (hand[i].oc.isMale === card.oc.isMale) {
            return [i] // only 1 inspired card
          }
        }
      } else if (ability === 3) {
        // bySubject
        for (let i = 0; i < hand.length; i++) {
          if (i === indexInHand) {
            continue
          }
          if (hand[i].oc.subject === card.oc.subject) {
            // adjacent?
            if (i === indexInHand + 1 || i === indexInHand - 1) {
              indices.push(i)
            }
          }
        }
      } else if (ability === 4) {
        // byRandom
        const p5 = this.p5
        if (this.selectController.isNotActionable()) {
          // true random
          while (true) {
            const pickedIndex = p5.floor(p5.random() * hand.length)
            if (pickedIndex !== indexInHand) {
              return [pickedIndex]
            }
          }
        } else {
          // looping
          const pickedIndex = p5.floor(p5.frameCount * 0.04) % 6
          if (pickedIndex !== indexInHand) {
            return [pickedIndex]
          } else {
            return [] // skip if is self
          }
        }
      }

      return indices
    },
    isNotActionable: () => {
      const projectController = this.projectController
      const selectController = this.selectController
      const queue = projectController.queue

      // project has a target
      // project has laser?
      // last project is still spawning?
      // is drawing (& shuffling)?
      // is animating drawing?
      // is discarding?
      // is hitting?
      // is inspiring?
      // game is over?
      return !!(
        projectController.hitController.target ||
        projectController.hitController.laser ||
        queue[queue.length - 1].spawnPrg < 2 ||
        this.deckController.isDrawing ||
        this.deckController.drawPrgs.length !== 0 ||
        selectController.discardPrg !== null ||
        selectController.assignInfo ||
        selectController.inspireInfo ||
        this.checkGameIsOver()
      )
    },
    renderControlSection: () => {
      const p5 = this.p5
      const selectController = this.selectController

      // shrink if not actionable
      if (selectController.isNotActionable()) {
        selectController.controlSectionPrg = p5.max(
          selectController.controlSectionPrg - 0.05,
          0,
        )
      } else {
        selectController.controlSectionPrg = p5.min(
          selectController.controlSectionPrg + 0.05,
          1,
        )
      }

      // render
      const assignBtn = this.gc.buttons[1]
      const discardBtn = this.gc.buttons[2]
      if (selectController.controlSectionPrg > 0) {
        let selectedCount = 0
        for (let i = 0; i < selectController.selectableCards.length; i++) {
          if (selectController.selectableCards[i].isSelected) {
            selectedCount++
          }
        }
        if (
          selectedCount !== selectController.previousSelectedCount &&
          selectedCount < 3 &&
          selectController.previousSelectedCount < 3
        ) {
          selectController.controlSectionPrg = 0
          selectController.previousSelectedCount = selectedCount
        }

        p5.push()
        p5.translate(
          0,
          10 * (1 - easeOutCubic(selectController.controlSectionPrg)),
        )
        if (selectedCount === 0) {
          // hint image
          p5.image(this.loadScene.hintTextImage, 460, 310, 240, 40)
          assignBtn.isHovered = false
          discardBtn.isHovered = false
        } else if (selectedCount === 1) {
          assignBtn.render(this.gc.mx, this.gc.my)
        } else {
          discardBtn.render(this.gc.mx, this.gc.my)
        }
        p5.pop()
      } else {
        // reset
        assignBtn.isHovered = false
        discardBtn.isHovered = false
        assignBtn.prg = 1
        discardBtn.prg = 1
      }
    },
    renderHoverPopup: () => {
      return
      const selectController = this.selectController
      if (selectController.hoveredIndex === null) {
        return
      }
      const p5 = this.p5

      p5.noStroke()
      p5.fill(0, 200)
      p5.rect(300, 75, 600, 150)
    },
  }

  constructor(gameClient: GameClient) {
    this.gc = gameClient
  }

  setup() {
    // reset
    this.screenShakePrg = 1
    this.gameIsOver = false
    this.statsController.energy = 10
    this.statsController.completedAmount = 0

    this.projectController.projectMaxHP = 10
    this.projectController.queue = []
    this.projectController.hitController.target = null
    this.projectController.hitController.laser = null
    this.projectController.hitController.flyer = null

    this.selectController.selectableCards = []
    this.selectController.starIndices = []
    for (let i = 0; i < 6; i++) {
      this.selectController.selectableCards.push({
        isSelected: false,
        outlinePrg: 0,
        moveUpPrg: 0,
        starPrg: 0,
        slideAmount: 0,
      })
    }

    this.deckController.cards = {
      drawPile: [],
      discardPile: [],
      hand: [],
      selectedCards: [],
    }
    // fill discardPile with default cards
    const cardImages = this.loadScene.cardImages
    this.deckController.cards.discardPile = originalCards.map((oc, index) => ({
      oc,
      power: 5,
      imageData: cardImages[index],
      squishPrg: 1,
      flipPrg: 1,
      spawnPrg: 0,
    }))

    // add starting projects
    const allSubjectTypes: SubjectType[] = [0, 1, 2, 3]
    while (allSubjectTypes.length > 0) {
      this.projectController.add(
        allSubjectTypes.splice(this.p5.random() * allSubjectTypes.length, 1)[0],
      )
    }

    this.deckController.startDrawing(20)
  }

  draw() {
    const { p5, loadScene, projectController, deckController } = this
    p5.cursor(p5.ARROW)
    p5.image(loadScene.backgroundImage, 300, 300, 600, 600)

    p5.push()
    if (this.screenShakePrg < 1) {
      this.screenShakePrg = p5.min(this.screenShakePrg + 0.012, 1)

      const frequency = 2
      const f =
        Math.sin(this.screenShakePrg * Math.PI * 2 * frequency) *
        Math.pow(1 - this.screenShakePrg, 2)

      p5.translate(0, f * this.screenShakeStrength * -25)
    }

    this.selectController.renderControlSection()

    projectController.renderProjects()

    deckController.renderHand()
    deckController.renderDrawPile()

    projectController.renderLaser()
    this.statsController.render()
    projectController.renderFlyer()

    this.selectController.renderHoverPopup()

    p5.pop()
  }

  keyReleased() {
    this.screenShakePrg = 0
    const keyCode = this.p5.keyCode
    if (this.selectController.isNotActionable()) return
    if (keyCode === 49) {
      this.projectController.damage(this.projectController.queue[0].subject, 15)
    } else if (keyCode === 50) {
      this.projectController.damage(this.projectController.queue[1].subject, 55)
    } else if (keyCode === 51) {
      this.projectController.damage(
        this.projectController.queue[2].subject,
        105,
      )
    } else if (keyCode === 52) {
      this.projectController.damage(this.projectController.queue[3].subject, 25)
    }
  }

  click() {
    const selectController = this.selectController
    if (selectController.isNotActionable()) {
      return
    }

    // selecting a card
    if (selectController.hoveredIndex !== null) {
      selectController.selectableCards[
        selectController.hoveredIndex
      ].isSelected =
        !selectController.selectableCards[selectController.hoveredIndex]
          .isSelected
      return
    }

    // clicking action button
    let selectedCount = 0
    for (let i = 0; i < selectController.selectableCards.length; i++) {
      if (selectController.selectableCards[i].isSelected) {
        selectedCount++
      }
    }
    let assignBtn = this.gc.buttons[1]
    let discardBtn = this.gc.buttons[2]
    if (selectedCount === 1 && assignBtn.isHovered) {
      assignBtn.clicked()
    } else if (selectedCount > 1 && discardBtn.isHovered) {
      discardBtn.clicked()
    }
  }
}
