import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Blob "mo:core/Blob";

actor {
  type Preset = {
    name : Text;
    gridData : Blob; // Float32 representation of 64x48x3 cell array
    settings : Text; // JSON string of instrument settings
  };

  module Preset {
    public func compareByName(preset1 : Preset, preset2 : Preset) : Order.Order {
      preset1.name.compare(preset2.name);
    };
  };

  let presets = Map.empty<Text, Preset>();

  public shared ({ caller }) func savePreset(name : Text, gridData : Blob, settings : Text) : async () {
    let preset : Preset = {
      name;
      gridData;
      settings;
    };
    presets.add(name, preset);
  };

  public query ({ caller }) func loadPreset(name : Text) : async Preset {
    switch (presets.get(name)) {
      case (null) { Runtime.trap("Preset not found") };
      case (?preset) { preset };
    };
  };

  public query ({ caller }) func listPresets() : async [Preset] {
    presets.values().toArray().sort(Preset.compareByName);
  };

  public shared ({ caller }) func deletePreset(name : Text) : async () {
    if (not presets.containsKey(name)) {
      Runtime.trap("Preset does not exist");
    };
    presets.remove(name);
  };
};
