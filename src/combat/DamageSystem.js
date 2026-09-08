export default class DamageSystem {
  static apply(context) {
    return context.target.takeDamage(context);
  }
}