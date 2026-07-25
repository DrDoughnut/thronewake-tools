// Tells React that `act()` is legitimate here, which turns the component
// tests from "works but warns" into a clean run.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
