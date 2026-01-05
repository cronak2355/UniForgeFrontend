/*
 * Condition에서 소비할 이벤트 신호를 저장하는 큐
 */

const signalQueue: string[] = [];

export const SignalStore = {
    push(signal: string) {
        signalQueue.push(signal);
    },

    consume(signal: string): boolean {
        const index = signalQueue.indexOf(signal);
        if (index === -1) return false;

        signalQueue.splice(index, 1);
        return true;
    },

    has(signal: string): boolean {
        return signalQueue.includes(signal);
    }
};
