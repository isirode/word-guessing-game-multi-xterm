import { BoolFlag } from "cmdy"

const force: BoolFlag = {
  name: "force",
  shorthand: "f",
  description: "Forcibly execute the command",
}

export {
  force,
}
