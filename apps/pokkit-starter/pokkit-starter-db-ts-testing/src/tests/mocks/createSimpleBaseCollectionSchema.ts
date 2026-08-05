export const createSimpleBaseCollectionSchema = (
  p: { name: string } & (
    | { rules: string }
    | {
        listRule: string;
        viewRule: string;
        createRule: string;
        updateRule: string;
        deleteRule: string;
      }
  ),
) => {
  const listRule = "rules" in p ? p.rules : p.listRule;
  const viewRule = "rules" in p ? p.rules : p.viewRule;
  const createRule = "rules" in p ? p.rules : p.createRule;
  const updateRule = "rules" in p ? p.rules : p.updateRule;
  const deleteRule = "rules" in p ? p.rules : p.deleteRule;
  return {
    id: "pbc_3580516180",
    listRule,
    viewRule,
    createRule,
    updateRule,
    deleteRule,
    name: p.name,
    type: "base",
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        help: "",
        hidden: false,
        id: "text3208210256",
        max: 15,
        min: 15,
        name: "id",
        pattern: "^[a-z0-9]+$",
        presentable: false,
        primaryKey: true,
        required: true,
        system: true,
        type: "text",
      },
      {
        autogeneratePattern: "",
        help: "",
        hidden: false,
        id: "text1579384326",
        max: 0,
        min: 0,
        name: "name",
        pattern: "",
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: "text",
      },
      {
        hidden: false,
        id: "autodate2990389176",
        name: "created",
        onCreate: true,
        onUpdate: false,
        presentable: false,
        system: false,
        type: "autodate",
      },
      {
        hidden: false,
        id: "autodate3332085495",
        name: "updated",
        onCreate: true,
        onUpdate: true,
        presentable: false,
        system: false,
        type: "autodate",
      },
    ],
    indexes: [],
    system: false,
  };
};
