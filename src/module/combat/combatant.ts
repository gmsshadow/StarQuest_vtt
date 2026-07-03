/**
 * Star Quest combatant. There is no initiative roll in this game, so we
 * neutralise initiative and rely on the Combat subclass's activation ordering.
 */
export class StarQuestCombatant extends foundry.documents.Combatant {
  /** No initiative formula — activation order is computed, not rolled. */
  getInitiativeRoll(): any {
    return null;
  }

  /** Rolling initiative is a no-op in Star Quest. */
  async rollInitiative(): Promise<this> {
    return this;
  }
}
