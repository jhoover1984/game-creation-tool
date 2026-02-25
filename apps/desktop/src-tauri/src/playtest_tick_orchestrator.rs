pub(crate) fn run_fixed_step_accumulator<F>(
    accumulator_ms: &mut f64,
    delta_ms: u32,
    speed: f64,
    step_ms: f64,
    mut on_step: F,
) -> u64
where
    F: FnMut(),
{
    *accumulator_ms += (delta_ms as f64) * speed;
    let mut steps = 0_u64;
    while *accumulator_ms >= step_ms {
        *accumulator_ms -= step_ms;
        steps = steps.saturating_add(1);
        on_step();
    }
    steps
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixed_step_accumulator_advances_expected_steps() {
        let mut accumulator = 0.0;
        let mut callbacks = 0_u64;
        let steps = run_fixed_step_accumulator(
            &mut accumulator,
            1000,
            1.0,
            1000.0 / 60.0,
            || callbacks = callbacks.saturating_add(1),
        );
        assert_eq!(steps, 60);
        assert_eq!(callbacks, 60);
    }

    #[test]
    fn fixed_step_accumulator_respects_speed_multiplier() {
        let mut accumulator = 0.0;
        let steps = run_fixed_step_accumulator(
            &mut accumulator,
            1000,
            0.5,
            10.0,
            || {},
        );
        assert_eq!(steps, 50);
    }
}
