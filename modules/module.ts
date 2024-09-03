export default abstract class Module {
    start(): void {}
    onSendData(data: Object): void {}
    onUserInactive(data: Object): void {}
    onUserReactive(data: Object): void {}
}