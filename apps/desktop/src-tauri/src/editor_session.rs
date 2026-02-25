use std::collections::HashMap;

use engine_core::EntityId;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum EditorContext {
    Map,
    Draw,
    Story,
    Animation,
    Audio,
}

#[derive(Debug, Default, Clone)]
struct SelectionState {
    current: Vec<EntityId>,
    previous: Vec<EntityId>,
}

#[derive(Debug)]
pub struct EditorSession {
    active_context: EditorContext,
    selections: HashMap<EditorContext, SelectionState>,
}

impl Default for EditorSession {
    fn default() -> Self {
        Self {
            active_context: EditorContext::Map,
            selections: HashMap::new(),
        }
    }
}

impl EditorSession {
    pub fn active_context(&self) -> EditorContext {
        self.active_context
    }

    pub fn set_active_context(&mut self, context: EditorContext) {
        self.active_context = context;
    }

    pub fn set_selection(&mut self, selection: Vec<EntityId>) {
        let entry = self.selections.entry(self.active_context).or_default();
        entry.previous = std::mem::take(&mut entry.current);
        entry.current = selection;
    }

    pub fn current_selection(&self) -> &[EntityId] {
        self.selections
            .get(&self.active_context)
            .map(|s| s.current.as_slice())
            .unwrap_or(&[])
    }

    pub fn reselect_previous(&mut self) -> Option<Vec<EntityId>> {
        let entry = self.selections.get_mut(&self.active_context)?;
        if entry.previous.is_empty() {
            return None;
        }
        std::mem::swap(&mut entry.current, &mut entry.previous);
        Some(entry.current.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn selection_history_is_context_scoped() {
        let mut session = EditorSession::default();

        session.set_selection(vec![1, 2]);
        session.set_selection(vec![3]);
        assert_eq!(session.current_selection(), &[3]);
        assert_eq!(session.reselect_previous(), Some(vec![1, 2]));
        assert_eq!(session.current_selection(), &[1, 2]);

        session.set_active_context(EditorContext::Draw);
        assert!(session.current_selection().is_empty());
        session.set_selection(vec![99]);
        assert_eq!(session.current_selection(), &[99]);

        session.set_active_context(EditorContext::Map);
        assert_eq!(session.current_selection(), &[1, 2]);
    }
}
