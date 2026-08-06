export default class DamageSystem {
  static apply(context) {
    context.target.takeDamage(context);
  }
}