// EventBus：跨组件/服务的类型无关事件总线。
//
// 组件之间不直接持有引用，统一通过事件名通信：
//   bus.on("presence", users => ...)   // 返回取消订阅函数
//   bus.emit("presence", users)
//
// 同一事件支持多个监听器；emit 同步派发，便于推理执行顺序。

export class EventBus {
  /** @type {Map<string, Set<Function>>} */
  #listeners = new Map();

  /**
   * 订阅事件。
   * @param {string} event
   * @param {Function} listener
   * @returns {() => void} 取消订阅
   */
  on(event, listener) {
    let set = this.#listeners.get(event);
    if (!set) {
      set = new Set();
      this.#listeners.set(event, set);
    }
    set.add(listener);
    return () => this.off(event, listener);
  }

  /**
   * 订阅一次，触发后自动移除。
   * @param {string} event
   * @param {Function} listener
   * @returns {() => void}
   */
  once(event, listener) {
    const wrapper = payload => {
      this.off(event, wrapper);
      listener(payload);
    };
    return this.on(event, wrapper);
  }

  /**
   * 移除监听器；省略 listener 时移除该事件的全部监听器。
   * @param {string} event
   * @param {Function} [listener]
   */
  off(event, listener) {
    if (!listener) {
      this.#listeners.delete(event);
      return;
    }
    this.#listeners.get(event)?.delete(listener);
  }

  /**
   * 派发事件。单个监听器抛错不影响其它监听器。
   * @param {string} event
   * @param {unknown} [payload]
   */
  emit(event, payload) {
    const set = this.#listeners.get(event);
    if (!set || set.size === 0) return;
    for (const listener of [...set]) {
      try {
        listener(payload);
      } catch (error) {
        console.error(`[EventBus] 监听器处理 "${event}" 时出错:`, error);
      }
    }
  }
}
