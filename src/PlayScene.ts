import type P5 from "p5"
import GameClient, { easeOutCubic } from "./main"
import { customFont } from "./font"
import LoadScene from "./LoadScene"
import originalCards, { OriginalCard } from "./originalCards"

type PlayingCard = {
  oc: OriginalCard
  power: number
  index: number
  squishPrg: number
  flipPrg: number // 0.5 is half way
}

type Project = {
  subject: SubjectType
  hp: number
  maxHp: number
  spawnPrg: number // 0 to 1: slide; 1 to 2: HP up
  moveUpPrg: number
}

type ProjectController = {
  readonly CENTERS: PositionType[]
  projectMaxHP: number
  queue: Project[]
  hitController: {
    // is null after removed or done draining
    target: {
      project: Project
      squishPrg: number
      squishStrength: number
      drainPrg: number // starts at negative to delay, also apply to flasher
      result: "INCOMPLETE" | "COMPLETE" | "PERFECT"
    } | null

    deployed: {
      card: PlayingCard
      targetRotation: number
      startPos: PositionType
      projectCenter: PositionType
      isCharging: boolean
    } | null

    // update energy & completedAmount on removed
    laser: {
      prg: number
      indexInQueue: number // identify arcs
      // deg (in radians) non-negative
      startDeg: number
      endDeg: number
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
  inputIsBlocked: () => boolean
  add: (subject: SubjectType) => void
  damage: (subject: SubjectType, hitAmount: number) => void
  remove: (subject: SubjectType) => void
  render: () => void
}

export default class PlayScene {
  gc: GameClient
  p5!: P5
  loadScene!: LoadScene

  cards!: Record<
    "drawPile" | "discardPile" | "hand" | "selectedCards",
    PlayingCard[]
  >

  stats: Record<"energy" | "completedAmount", number> = {
    energy: 0,
    completedAmount: 0,
  }

  projectController: ProjectController = {
    CENTERS: [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ],
    projectMaxHP: 10,
    queue: [],
    hitController: {
      target: null,
      deployed: null,
      laser: null,
      flyer: null,
    },
    inputIsBlocked: () => {
      // input is blocked target is completed
      const target = this.projectController.hitController.target
      return target !== null && target.result !== "INCOMPLETE"
    },
    add: (subject) => {
      const projectController = this.projectController
      const maxHp = projectController.projectMaxHP
      projectController.projectMaxHP += 5 // increase
      projectController.queue.push({
        subject,
        hp: maxHp,
        maxHp: maxHp,
        spawnPrg: -projectController.queue.length * 0.6, // start with delay
        moveUpPrg: 1,
      })
    },
    damage: (subject, hitAmount) => {},
    remove: (subject) => {
      // spawn flyer & lasers
      // set moveUpPrg for other projects
      // add new project
    },
    render: () => {
      const p5 = this.p5
      const queue = this.projectController.queue
      let { projectGraphics, renderProjectGraphics } = this.loadScene
      renderProjectGraphics = renderProjectGraphics.bind(this) //$

      for (let i = 0; i < queue.length; i++) {
        const project = queue[i]

        // spawnPrg
        project.spawnPrg = p5.min(project.spawnPrg + 0.016, 2)
        const spawnXOffset =
          (1 - easeOutCubic(p5.min(project.spawnPrg, 1))) * -300
        // also after spawn display
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
          10 + spawnXOffset,
          20 + 85 * i,
          280,
          70,
        )

        // light panel
        if (hpFactor > 0) {
          renderProjectGraphics(
            projectGraphics.light[project.subject],
            0,
            0,
            280 * hpFactor,
            70,
            10 + spawnXOffset,
            20 + 85 * i,
            280 * hpFactor,
            70,
          )
        }

        // white panel (damaged)

        // contents (hp display number is real hp + draining if is hit target)
      }
    },
  }

  constructor(gameClient: GameClient) {
    this.gc = gameClient
  }

  setup() {
    // reset
    this.stats = {
      energy: 10,
      completedAmount: 0,
    }
    this.cards = {
      drawPile: [],
      discardPile: [],
      hand: [],
      selectedCards: [],
    }
    this.projectController.projectMaxHP = 10
    this.projectController.queue = []
    this.projectController.hitController.target = null
    this.projectController.hitController.deployed = null
    this.projectController.hitController.laser = null
    this.projectController.hitController.flyer = null

    // fill discardPile with default cards
    this.cards.discardPile = originalCards.map((oc, index) => ({
      oc,
      power: 5,
      index: index,
      squishPrg: 1,
      flipPrg: 1,
    }))

    // add starting projects
    const allSubjectTypes: SubjectType[] = [0, 1, 2, 3]
    while (allSubjectTypes.length > 0) {
      this.projectController.add(
        allSubjectTypes.splice(this.p5.random() * allSubjectTypes.length, 1)[0],
      )
    }
  }

  draw() {
    const { p5, loadScene } = this
    p5.cursor(p5.ARROW)
    p5.image(loadScene.backgroundImage, 300, 300, 600, 600)

    this.projectController.render()
  }

  keyReleased() {
    const keyCode = this.p5.keyCode
    // 1,2,3,4: hit projects
  }

  click() {
    const gc = this.gc
    const { mx, my } = gc
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
