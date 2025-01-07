class EventManager {
    constructor(bot) {
      this.bot = bot;
      this.events = new Map();
    }
  
    registerEvent(config) {
      this.events.set(config.name, config);
      
      if (config.schedule) {
        setInterval(() => {
          this.triggerEvent(config.name);
        }, config.schedule.interval);
      }
    }
  
    async triggerEvent(name, data) {
      const event = this.events.get(name);
      if (event) {
        await event.action(this.bot, data);
      }
    }
  }
  
  module.exports = EventManager;