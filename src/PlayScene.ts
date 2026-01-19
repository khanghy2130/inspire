import type P5 from "p5"
import GameClient from "./main"
import { customFont } from "./font"
import LoadScene from "./LoadScene"
import originalCards, { OriginalCard } from "./originalCards"

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

  selectedCard: TestPlayingCard | null = null

  turns: number = 0
  completedAmount: number = 0
  discardIsAvaliable: boolean = false

  constructor(gameClient: GameClient) {
    this.gc = gameClient
  }

  setup() {
    // reset
    this.discardIsAvaliable = true
    this.turns = 10
    this.completedAmount = 0
    this.hand = []
    this.discardPile = []
    this.projectsList = []
    this.drawPile = originalCards.map((oc, index) => ({
      oc,
      power: 5,
      index: index,
    }))

    this.testDraw()

    const allSubjectTypes: SubjectType[] = [0, 1, 2, 3]
    while (allSubjectTypes.length > 0) {
      this.testAddProject(
        allSubjectTypes.splice(this.p5.random() * allSubjectTypes.length, 1)[0],
      )
    }
  }

  testAddProject(subject: SubjectType) {
    const pl = this.projectsList
    // set maxHp to previous maxHP + 5
    const newMaxHP = pl.length === 0 ? 10 : pl[pl.length - 1].maxHp + 5
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

  testDraw() {
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

  draw() {
    const { p5, loadScene } = this
    p5.cursor(p5.ARROW)
    p5.image(loadScene.backgroundImage, 300, 300, 600, 600)

    // render texts
    p5.textSize(20)
    p5.noStroke()
    p5.fill(240, 210, 100)
    p5.text(
      `Turns: ${this.turns}\nCompleted: ${this.completedAmount}\nDraw pile: ${this.drawPile.length}\nCan discard: ${this.discardIsAvaliable}`,
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
      if (this.selectedCard === card) {
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
    }
  }

  keyReleased() {
    const keyCode = this.p5.keyCode

    if (this.selectedCard) {
      const sCard = this.selectedCard

      // I: inspire
      if (keyCode === 73) {
        sCard.power += 5
      }
      // P: play
      else if (keyCode === 80) {
        this.turns--
        this.discardIsAvaliable = true
        // hit project
        for (let i = 0; i < this.projectsList.length; i++) {
          const project = this.projectsList[i]
          if (project.subject !== sCard.oc.subject) continue
          project.hp -= sCard.power
          // completed project? replace with new project
          if (project.hp <= 0) {
            this.completedAmount++
            this.turns += 5
            this.projectsList.splice(i, 1)
            this.testAddProject(project.subject)
          }
        }
        // >>> discard played card
        // remove card from hand
        this.hand.splice(this.hand.indexOf(sCard), 1)
        // add to discard pile
        this.discardPile.push(sCard)
        this.testDraw() // draw new card
        this.selectedCard = null
      }
      // D: discard
      else if (keyCode === 68) {
        if (!this.discardIsAvaliable) return
        // remove card from hand
        this.hand.splice(this.hand.indexOf(sCard), 1)
        // add to discard pile
        this.discardPile.push(sCard)
        this.testDraw() // draw new card
        this.selectedCard = null
      }
    }

    // Q: no more discard
    if (keyCode === 81) {
      this.discardIsAvaliable = false
    }
  }

  click() {
    const gc = this.gc
    const { mx, my } = gc
    // selecting a card
    for (let i = 0; i < this.hand.length; i++) {
      const x = 75 + i * 90
      if (mx < x + 50 && mx > x - 50 && my < 500 + 80 && my > 500 - 80) {
        this.selectedCard = this.hand[i]
        return
      }
    }
  }
}
