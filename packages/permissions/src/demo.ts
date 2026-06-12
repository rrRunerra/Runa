import {
  BitField,
  PolarisBitField,
  LynxBitField,
  DEFAULT_PERMISSIONS,
} from "./index";

function runDemo() {
  console.log("=== Runa Permissions Shared Package Demo ===\n");

  // 1. Check Default Permissions
  console.log("1. Default Permissions:");
  console.log("DEFAULT_PERMISSIONS:", DEFAULT_PERMISSIONS);
  console.log("");

  // 2. Initialize PolarisBitField and add VIEW permission
  console.log("2. Polaris Permission Handling:");
  const polarisUserPerms = new PolarisBitField();
  console.log("Initial raw bitfield:", polarisUserPerms.serialize()); // should be []
  console.log("Has VIEW?", polarisUserPerms.has("VIEW")); // false

  polarisUserPerms.add("VIEW");
  console.log("After adding VIEW:", polarisUserPerms.serialize()); // should be [1]
  console.log("Has VIEW?", polarisUserPerms.has("VIEW")); // true
  console.log("Has MANAGE?", polarisUserPerms.has("MANAGE")); // false
  console.log("");

  // 3. Serialize and Deserialize (DB round-trip simulate)
  console.log("3. Database Serialization / Deserialization:");
  const dbValue = polarisUserPerms.serialize();
  console.log("Value stored in Database (Int[]):", dbValue);

  // Load back from database
  const loadedPerms = PolarisBitField.fromRaw(dbValue);
  console.log("Rehydrated from DB:", loadedPerms.serialize());
  console.log("Rehydrated has VIEW?", loadedPerms.has("VIEW")); // true
  console.log("");

  // 4. Polymorphic constructors and arrays
  console.log("4. Polymorphic Resolution:");
  const compositePerms = new PolarisBitField([
    PolarisBitField.Flags.VIEW,
    "MANAGE",
  ]);
  console.log("Composite perms from array [VIEW, 'MANAGE']:", compositePerms.serialize()); // should be [3]
  console.log("Has VIEW & MANAGE?", compositePerms.has(["VIEW", "MANAGE"])); // true
  console.log("");

  // 5. ADMINISTRATOR Bypass Demo
  console.log("5. Administrator Bypass:");
  const adminPerms = new PolarisBitField();
  adminPerms.add(BitField.Flags.ADMINISTRATOR);
  
  console.log("Admin serialized bitfield:", adminPerms.serialize()); 
  console.log("Length of admin bitfield:", adminPerms.serialize().length); // should be 32 (index 31 holds 128)
  console.log("Admin has VIEW?", adminPerms.has("VIEW")); // true (bypassed)
  console.log("Admin has MANAGE?", adminPerms.has("MANAGE")); // true (bypassed)
  console.log("Admin has ADMINISTRATOR explicitly?", adminPerms.has(BitField.Flags.ADMINISTRATOR)); // true
  console.log("");

  console.log("=== Demo Completed Successfully ===");
}

runDemo();
