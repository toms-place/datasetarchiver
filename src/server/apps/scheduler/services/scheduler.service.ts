import Schedulder from '../../../../master/scheduler'

export class SchedulerService {
  static async stop(): Promise < any > {
    Schedulder.dbFlag = false
    return true
  }

  static async start(): Promise < any > {
    try {
      await Schedulder.clear()
      Schedulder.tick()
      return true
    } catch (error) {
      return false
    }
  }
}

export default new SchedulerService();