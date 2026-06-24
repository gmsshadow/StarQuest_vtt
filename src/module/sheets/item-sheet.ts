const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * A single item sheet that adapts its body partial to the item subtype.
 * Keeps the six item types lightweight without six separate sheet classes.
 */
export class StarQuestItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["star-quest", "sheet", "item"],
    position: { width: 460, height: 480 },
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    body: { template: "systems/star-quest/templates/item/item-sheet.hbs" }
  };

  async _prepareContext(_options: unknown) {
    const item = this.document as any;
    return {
      item,
      system: item.system,
      type: item.type,
      editable: this.isEditable
    };
  }
}
