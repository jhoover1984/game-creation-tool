use std::collections::HashMap;
use std::hash::Hash;

use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum CommandError {
    #[error("command failed: {0}")]
    Failed(String),
    #[error("nothing to undo")]
    NothingToUndo,
    #[error("nothing to redo")]
    NothingToRedo,
}

pub trait Command<S>: Send {
    fn label(&self) -> &str;
    fn execute(&mut self, state: &mut S) -> Result<(), CommandError>;
    fn undo(&mut self, state: &mut S) -> Result<(), CommandError>;
}

pub struct BatchCommand<S> {
    label: String,
    commands: Vec<Box<dyn Command<S>>>,
}

impl<S> BatchCommand<S> {
    pub fn new(label: impl Into<String>) -> Self {
        Self {
            label: label.into(),
            commands: Vec::new(),
        }
    }

    pub fn push(&mut self, command: Box<dyn Command<S>>) {
        self.commands.push(command);
    }
}

impl<S> Command<S> for BatchCommand<S> {
    fn label(&self) -> &str {
        &self.label
    }

    fn execute(&mut self, state: &mut S) -> Result<(), CommandError> {
        for command in &mut self.commands {
            command.execute(state)?;
        }
        Ok(())
    }

    fn undo(&mut self, state: &mut S) -> Result<(), CommandError> {
        for command in self.commands.iter_mut().rev() {
            command.undo(state)?;
        }
        Ok(())
    }
}

pub struct CommandStack<S> {
    undo_stack: Vec<Box<dyn Command<S>>>,
    redo_stack: Vec<Box<dyn Command<S>>>,
}

pub struct ContextCommandBus<S, K>
where
    K: Eq + Hash + Clone,
{
    global: CommandStack<S>,
    contexts: HashMap<K, CommandStack<S>>,
}

impl<S, K> Default for ContextCommandBus<S, K>
where
    K: Eq + Hash + Clone,
{
    fn default() -> Self {
        Self {
            global: CommandStack::default(),
            contexts: HashMap::new(),
        }
    }
}

impl<S> Default for CommandStack<S> {
    fn default() -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
        }
    }
}

impl<S> CommandStack<S> {
    pub fn execute(
        &mut self,
        state: &mut S,
        mut command: Box<dyn Command<S>>,
    ) -> Result<(), CommandError> {
        command.execute(state)?;
        self.undo_stack.push(command);
        self.redo_stack.clear();
        Ok(())
    }

    pub fn undo(&mut self, state: &mut S) -> Result<(), CommandError> {
        let Some(mut command) = self.undo_stack.pop() else {
            return Err(CommandError::NothingToUndo);
        };
        command.undo(state)?;
        self.redo_stack.push(command);
        Ok(())
    }

    pub fn redo(&mut self, state: &mut S) -> Result<(), CommandError> {
        let Some(mut command) = self.redo_stack.pop() else {
            return Err(CommandError::NothingToRedo);
        };
        command.execute(state)?;
        self.undo_stack.push(command);
        Ok(())
    }

    pub fn undo_len(&self) -> usize {
        self.undo_stack.len()
    }

    pub fn redo_len(&self) -> usize {
        self.redo_stack.len()
    }
}

impl<S, K> ContextCommandBus<S, K>
where
    K: Eq + Hash + Clone,
{
    pub fn execute_global(
        &mut self,
        state: &mut S,
        command: Box<dyn Command<S>>,
    ) -> Result<(), CommandError> {
        self.global.execute(state, command)
    }

    pub fn undo_global(&mut self, state: &mut S) -> Result<(), CommandError> {
        self.global.undo(state)
    }

    pub fn redo_global(&mut self, state: &mut S) -> Result<(), CommandError> {
        self.global.redo(state)
    }

    pub fn execute_in_context(
        &mut self,
        context: K,
        state: &mut S,
        command: Box<dyn Command<S>>,
    ) -> Result<(), CommandError> {
        self.contexts
            .entry(context)
            .or_default()
            .execute(state, command)
    }

    pub fn undo_in_context(&mut self, context: &K, state: &mut S) -> Result<(), CommandError> {
        let Some(stack) = self.contexts.get_mut(context) else {
            return Err(CommandError::NothingToUndo);
        };
        stack.undo(state)
    }

    pub fn redo_in_context(&mut self, context: &K, state: &mut S) -> Result<(), CommandError> {
        let Some(stack) = self.contexts.get_mut(context) else {
            return Err(CommandError::NothingToRedo);
        };
        stack.redo(state)
    }

    pub fn global_undo_len(&self) -> usize {
        self.global.undo_len()
    }

    pub fn context_undo_len(&self, context: &K) -> usize {
        self.contexts.get(context).map_or(0, |s| s.undo_len())
    }

    pub fn context_redo_len(&self, context: &K) -> usize {
        self.contexts.get(context).map_or(0, |s| s.redo_len())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Default)]
    struct CounterState {
        value: i32,
    }

    struct AddCommand {
        amount: i32,
    }

    impl Command<CounterState> for AddCommand {
        fn label(&self) -> &str {
            "add"
        }

        fn execute(&mut self, state: &mut CounterState) -> Result<(), CommandError> {
            state.value += self.amount;
            Ok(())
        }

        fn undo(&mut self, state: &mut CounterState) -> Result<(), CommandError> {
            state.value -= self.amount;
            Ok(())
        }
    }

    #[test]
    fn command_stack_execute_undo_redo_cycle() {
        let mut state = CounterState::default();
        let mut stack = CommandStack::default();

        stack
            .execute(&mut state, Box::new(AddCommand { amount: 5 }))
            .expect("execute");
        assert_eq!(state.value, 5);
        assert_eq!(stack.undo_len(), 1);
        assert_eq!(stack.redo_len(), 0);

        stack.undo(&mut state).expect("undo");
        assert_eq!(state.value, 0);
        assert_eq!(stack.undo_len(), 0);
        assert_eq!(stack.redo_len(), 1);

        stack.redo(&mut state).expect("redo");
        assert_eq!(state.value, 5);
        assert_eq!(stack.undo_len(), 1);
        assert_eq!(stack.redo_len(), 0);
    }

    #[test]
    fn batch_command_executes_as_single_stack_entry() {
        let mut state = CounterState::default();
        let mut stack = CommandStack::default();
        let mut batch = BatchCommand::new("bulk");
        batch.push(Box::new(AddCommand { amount: 2 }));
        batch.push(Box::new(AddCommand { amount: 3 }));

        stack
            .execute(&mut state, Box::new(batch))
            .expect("execute batch");
        assert_eq!(state.value, 5);
        assert_eq!(stack.undo_len(), 1);

        stack.undo(&mut state).expect("undo batch");
        assert_eq!(state.value, 0);
    }

    #[test]
    fn undo_and_redo_errors_are_explicit() {
        let mut state = CounterState::default();
        let mut stack = CommandStack::<CounterState>::default();

        let undo_err = stack.undo(&mut state).expect_err("undo should fail");
        assert_eq!(undo_err, CommandError::NothingToUndo);

        let redo_err = stack.redo(&mut state).expect_err("redo should fail");
        assert_eq!(redo_err, CommandError::NothingToRedo);
    }

    #[test]
    fn context_command_bus_scopes_history_by_context() {
        let mut state = CounterState::default();
        let mut bus = ContextCommandBus::<CounterState, String>::default();
        let map_ctx = "map".to_string();
        let draw_ctx = "draw".to_string();

        bus.execute_in_context(
            map_ctx.clone(),
            &mut state,
            Box::new(AddCommand { amount: 5 }),
        )
        .expect("map execute");
        bus.execute_in_context(
            draw_ctx.clone(),
            &mut state,
            Box::new(AddCommand { amount: 2 }),
        )
        .expect("draw execute");
        assert_eq!(state.value, 7);

        bus.undo_in_context(&map_ctx, &mut state).expect("undo map");
        assert_eq!(state.value, 2);

        bus.undo_in_context(&draw_ctx, &mut state)
            .expect("undo draw");
        assert_eq!(state.value, 0);
    }
}
