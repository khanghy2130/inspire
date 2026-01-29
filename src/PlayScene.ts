import type P5 from "p5"
import GameClient, { easeOutCubic, easeOutElastic } from "./main"
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

// animating deployed card outside of projectController
// deployed: {
//   card: PlayingCard
//   targetRotation: number
//   startPos: PositionType
//   currentPos: PositionType
//   projectCenter: PositionType
//   isCharging: boolean
// }

type SelectableCard = {
  isSelected: boolean
  outlinePrg: number
  moveUpPrg: number
  starPrg: number
  squishPrg: number
  slideAmount: number // 0 is same position
}

type SelectController = {
  selectableCards: SelectableCard[]
  starIndices: number[]
  hoveredIndex: number | null
  discardPrg: number | null // not discarding if is null
  controlSectionPrg: number
  previousSelectedCount: number
  discardClicked: () => void
  getInspiredIndices: (indexInHand: number) => number[]
  isNotActionable: () => boolean
  renderControlSection: () => void
}

type StatsController = {
  bouncePrg: number
  energy: number
  completedAmount: number
  render: () => void
}

type ProjectController = {
  readonly Y_POSITONS: number[] // X value is always 150
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
  renderHand: () => void
}

export default class PlayScene {
  gc: GameClient
  p5!: P5
  loadScene!: LoadScene

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
        squishStrength: this.p5.constrain(hitAmount / project.maxHp, 0.2, 1),
        drainPrg: -1,
        isCompleted,
        isPerfect,
      }
    },
    renderProjects: () => {
      const p5 = this.p5
      const projectController = this.projectController
      const queue = projectController.queue
      const target = projectController.hitController.target
      let { projectGraphics, renderProjectGraphics } = this.loadScene
      let doesRemoveTarget = false

      // all projects
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

        // contents (hp display number is real hp + draining if is hit target)
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
          const ARC_TABLE: [number, number, number, number, number, number][] =
            [
              // x,y,w,h, end angle, start angle
              [305, 50, 310, 330, 0, p5.PI],
              [300, 50, 320, 440, 0, p5.PI - 0.6],
              [280, 50, 360, 550, 0, p5.PI - 0.95],
              [270, 50, 380, 660, 0, p5.PI - 1.15],
            ]
          projectController.hitController.laser = {
            isPerfect: target.isPerfect,
            arcInfo: ARC_TABLE[i],
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
        p5.stroke(255, 255, 0)
      } else {
        p5.stroke(255)
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
      for (let di = 0; di < deckController.drawPrgs.length; di++) {
        deckController.drawPrgs[di] += 0.02
        const prg = deckController.drawPrgs[di]

        const handIndex =
          cards.hand.length - deckController.drawPrgs.length + di
        const card = cards.hand[handIndex]

        const easedPrg = easeOutCubic(prg)
        const x = p5.map(easedPrg, 0, 1, 530, 75 + handIndex * 90)
        const y = p5.map(easedPrg, 0, 1, 180, 500)

        // backside 0 to 0.5
        if (easedPrg < 0.5) {
          p5.image(backsideImage, x, y, 100, 160)
        }
        // 0.5 to 0.75 backside flipping
        else if (easedPrg < 0.75) {
          p5.image(
            backsideImage,
            x,
            y,
            100 * p5.map(easedPrg, 0.5, 0.75, 1, 0),
            160,
          )
        }
        // 0.75 to 1 face side flipping
        else {
          p5.image(
            card.imageData,
            x,
            y,
            100 * p5.map(easedPrg, 0.75, 1, 0, 1),
            160,
          )
          /// also render power
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
        selectController.discardPrg += 0.03
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

      const rLength = hand.length - deckController.drawPrgs.length
      for (let i = 0; i < rLength; i++) {
        const card = hand[i]
        const selectableCard = selectController.selectableCards[i]

        // update outlinePrg
        if (selectController.hoveredIndex === i) {
          selectableCard.outlinePrg = p5.min(selectableCard.outlinePrg + 0.2, 1)
        } else {
          selectableCard.outlinePrg = p5.max(selectableCard.outlinePrg - 0.2, 0)
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
            ? easeOutCubic(selectController.discardPrg) * 230
            : 0
        // being slided animation
        const discardXOffset =
          selectController.discardPrg === null
            ? 0
            : easeOutCubic(selectController.discardPrg) *
              selectableCard.slideAmount *
              90
        p5.translate(
          75 + i * 90 + discardXOffset,
          500 - selectableCard.moveUpPrg * 30 + discardYOffset,
        )

        // render outline
        if (selectableCard.outlinePrg > 0) {
          p5.noFill()
          p5.stroke(250)
          p5.strokeWeight(selectableCard.outlinePrg * 5)
          p5.rect(0, 0, 100, 160, 20)
        }

        // render card image
        p5.image(card.imageData, 0, 0, 100, 160)

        //// render power

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
    discardClicked: () => {
      const selectController = this.selectController
      selectController.discardPrg = 0
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
      const queue = projectController.queue

      // project has a target or laser?
      // last project is still spawning?
      // is drawing (& shuffling)?
      // is animating drawing?
      // is discarding?
      /////// is hitting?
      return !!(
        projectController.hitController.target ||
        projectController.hitController.laser ||
        queue[queue.length - 1].spawnPrg < 2 ||
        this.deckController.isDrawing ||
        this.deckController.drawPrgs.length !== 0 ||
        this.selectController.discardPrg !== null
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
  }

  constructor(gameClient: GameClient) {
    this.gc = gameClient
  }

  setup() {
    // reset
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
        squishPrg: 0,
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

    this.selectController.renderControlSection()

    projectController.renderProjects()

    deckController.renderHand()
    deckController.renderDrawPile()

    projectController.renderLaser()
    this.statsController.render()
    projectController.renderFlyer()
  }

  keyReleased() {
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
      this.projectController.damage(this.projectController.queue[0].subject, 15) ///
    } else if (selectedCount > 1 && discardBtn.isHovered) {
      discardBtn.clicked()
    }
  }
}

/*

type TestPlayingCard = {
  oc: OriginalCard
  power: number
  index: number
}

type TestProject = {
  subject: SubjectType
  hp: number
  maxHp: number
}

export default class PlayScene {
  gc: GameClient
  p5!: P5
  loadScene!: LoadScene

  // quick prototype
  drawPile: TestPlayingCard[] = []
  discardPile: TestPlayingCard[] = []
  hand: TestPlayingCard[] = []
  projectsList: TestProject[] = []

  selectedCards: TestPlayingCard[] = []

  energy: number = 0
  completedAmount: number = 0
  projectMaxHP: number = 10

  constructor(gameClient: GameClient) {
    this.gc = gameClient
  }

  setup() {
    // reset
    this.energy = 10
    this.projectMaxHP = 10
    this.completedAmount = 0
    this.hand = []
    this.discardPile = []
    this.projectsList = []
    this.drawPile = originalCards.map((oc, index) => ({
      oc,
      power: 5,
      index: index,
    }))

    this.testDrawToFillHand()

    const allSubjectTypes: SubjectType[] = [0, 1, 2, 3]
    while (allSubjectTypes.length > 0) {
      this.testAddProject(
        allSubjectTypes.splice(this.p5.random() * allSubjectTypes.length, 1)[0],
      )
    }
  }

  testAddProject(subject: SubjectType) {
    const pl = this.projectsList
    // set maxHp to previous maxHP +x
    const newMaxHP = this.projectMaxHP
    this.projectMaxHP += 5
    pl.push({
      hp: newMaxHP,
      maxHp: newMaxHP,
      subject,
    })
  }

  testShuffle() {
    // discardPile becomes drawPile
    this.drawPile = this.discardPile
    this.discardPile = []
  }

  testDrawToFillHand() {
    while (this.hand.length < 6) {
      // reshuffle if needed
      if (this.drawPile.length === 0) {
        this.testShuffle()
      }
      // draw a random card from drawPile
      this.hand.push(
        this.drawPile.splice(
          this.p5.floor(this.p5.random() * this.drawPile.length),
          1,
        )[0],
      )
    }
  }

  testSelectCard(card: TestPlayingCard) {
    const scs = this.selectedCards
    const indexOfCard = scs.indexOf(card)
    if (indexOfCard === -1) {
      scs.push(card)
    } else {
      scs.splice(indexOfCard, 1)
    }
  }

  draw() {
    const { p5, loadScene } = this
    p5.cursor(p5.ARROW)
    p5.image(loadScene.backgroundImage, 300, 300, 600, 600)

    // render texts
    p5.textSize(20)
    p5.noStroke()
    p5.fill(240, 210, 100)
    p5.text(
      `Energy: ${this.energy}\nCompleted: ${this.completedAmount}\nDraw pile: ${this.drawPile.length}`,
      500,
      100,
    )

    // render projects
    p5.textSize(40)
    for (let i = 0; i < this.projectsList.length; i++) {
      const project = this.projectsList[i]
      p5.fill(loadScene.SUBJECT_COLORS[project.subject])
      p5.text(`HP: ${project.hp}`, 100, 100 + i * 50)
    }

    // render hand
    p5.textSize(30)
    for (let i = 0; i < this.hand.length; i++) {
      const card = this.hand[i]
      const x = 75 + i * 90
      if (this.selectedCards.includes(card)) {
        p5.noFill()
        p5.stroke(250)
        p5.strokeWeight(5)
        p5.rect(x, 500, 100, 160, 20)
      }
      p5.image(loadScene.cardImages[card.index], x, 500, 100, 160)
      // power
      p5.stroke(0)
      p5.strokeWeight(5)
      p5.fill(250)
      p5.text(card.power, x - 20, 450)
      let eligibleCount: number | null = null
      if (card.oc.ability === 0) {
        // byName
        eligibleCount = this.drawPile.reduce(
          (count, drawC) =>
            count + (drawC.oc.name[0] === card.oc.name[0] ? 1 : 0),
          0,
        )
      } else if (card.oc.ability === 1) {
        // byBody
        eligibleCount = this.drawPile.reduce(
          (count, drawC) => count + (drawC.oc.body === card.oc.body ? 1 : 0),
          0,
        )
      } else if (card.oc.ability === 3) {
        // bySubject
        eligibleCount = this.drawPile.reduce(
          (count, drawC) =>
            count + (drawC.oc.subject === card.oc.subject ? 1 : 0),
          0,
        )
      }
      if (eligibleCount !== null) {
        p5.text(eligibleCount, x, 500)
      }
    }
  }

  keyReleased() {
    const keyCode = this.p5.keyCode

    const scs = this.selectedCards
    if (scs.length > 0) {
      // I: inspire
      if (keyCode === 73) {
        scs.forEach((c) => (c.power += 5))
      }
      // P: play
      else if (keyCode === 80) {
        // only if selected 1 card
        if (scs.length > 1) return
        const sCard = scs[0]
        this.energy--
        // hit project
        for (let i = 0; i < this.projectsList.length; i++) {
          const project = this.projectsList[i]
          if (project.subject !== sCard.oc.subject) continue
          project.hp -= sCard.power
          // completed project? replace with new project
          if (project.hp <= 0) {
            this.completedAmount++
            this.energy += 3
            // extra turn if hp is exactly 0
            if (project.hp === 0) this.energy += 1
            this.projectsList.splice(i, 1)
            this.testAddProject(project.subject)
            break
          }
        }
        // >>> discard played card
        // remove card from hand
        this.hand.splice(this.hand.indexOf(sCard), 1)
        // add to discard pile
        this.discardPile.push(sCard)
        this.testDrawToFillHand() // draw new card
        this.selectedCards = [] // deselect all
      }
      // D: discard
      else if (keyCode === 68) {
        if (scs.length === 1) return // can't discard exactly 1 card
        this.energy--
        while (scs.length > 0) {
          const sCard = scs.shift() as TestPlayingCard
          // remove card from hand
          this.hand.splice(this.hand.indexOf(sCard), 1)
          // add to discard pile
          this.discardPile.push(sCard)
        }
        this.testDrawToFillHand() // draw new cards
      }
    }
  }

  click() {
    const gc = this.gc
    const { mx, my } = gc
    // selecting a card
    for (let i = 0; i < this.hand.length; i++) {
      const x = 75 + i * 90
      if (mx < x + 50 && mx > x - 50 && my < 500 + 80 && my > 500 - 80) {
        this.testSelectCard(this.hand[i])
        return
      }
    }
  }
}


*/
