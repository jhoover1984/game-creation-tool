use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct PlaytestProgressUpdate {
    pub item_pickup_reached: bool,
    pub quest_state_reached: bool,
}

pub(crate) const ITEM_PICKUP_FRAME_THRESHOLD: u64 = 120;
pub(crate) const QUEST_STATE_FRAME_THRESHOLD: u64 = 300;
pub(crate) const COIN_TICK_FRAME_INTERVAL: u64 = 180;

pub(crate) fn apply_playtest_progress(
    frame: u64,
    core_watch_flags: &mut HashMap<String, bool>,
    core_watch_variables: &mut HashMap<String, i64>,
    core_watch_inventory: &mut HashMap<String, u32>,
) -> PlaytestProgressUpdate {
    let item_pickup_reached = frame >= ITEM_PICKUP_FRAME_THRESHOLD;
    if item_pickup_reached {
        core_watch_flags.insert("player_has_key".to_string(), true);
        core_watch_inventory.insert("key_item".to_string(), 1);
    }

    let quest_state_reached = frame >= QUEST_STATE_FRAME_THRESHOLD;
    if quest_state_reached {
        core_watch_flags.insert("quest_intro_active".to_string(), false);
        core_watch_flags.insert("quest_intro_completed".to_string(), true);
        core_watch_variables.insert("quest_stage".to_string(), 1);
    }

    if frame.is_multiple_of(COIN_TICK_FRAME_INTERVAL) {
        let coins = core_watch_variables
            .entry("player_coins".to_string())
            .or_insert(0);
        *coins = coins.saturating_add(1);
    }

    PlaytestProgressUpdate {
        item_pickup_reached,
        quest_state_reached,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn applies_item_and_quest_thresholds_and_coin_tick() {
        let mut flags = HashMap::new();
        let mut vars = HashMap::new();
        let mut inventory = HashMap::new();
        vars.insert("player_coins".to_string(), 0);

        let update = apply_playtest_progress(360, &mut flags, &mut vars, &mut inventory);
        assert!(update.item_pickup_reached);
        assert!(update.quest_state_reached);
        assert_eq!(flags.get("player_has_key"), Some(&true));
        assert_eq!(flags.get("quest_intro_completed"), Some(&true));
        assert_eq!(vars.get("quest_stage"), Some(&1));
        assert_eq!(vars.get("player_coins"), Some(&1));
        assert_eq!(inventory.get("key_item"), Some(&1));
    }

    #[test]
    fn below_thresholds_no_item_or_quest_changes() {
        let mut flags = HashMap::new();
        let mut vars = HashMap::new();
        let mut inventory = HashMap::new();
        vars.insert("player_coins".to_string(), 5);

        let update = apply_playtest_progress(119, &mut flags, &mut vars, &mut inventory);
        assert!(!update.item_pickup_reached);
        assert!(!update.quest_state_reached);
        assert_eq!(flags.get("player_has_key"), None);
        assert_eq!(inventory.get("key_item"), None);
        assert_eq!(vars.get("player_coins"), Some(&5));
    }
}
