// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';

const resetStore = () => {
  useStore.setState({
    ast: [{ id: 'body-root', type: 'body', children: [] }],
    astPast: [],
    astFuture: [],
    selectedContainerId: 'body-root',
  });
};

const bodyChildren = () => useStore.getState().ast[0].children;

describe('workspace undo/redo', () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetStore();
  });

  it('undo restores the AST after adding a block', () => {
    useStore.getState().addBlock('h1', 'body-root');
    expect(bodyChildren().length).toBe(1);
    useStore.getState().undo();
    expect(bodyChildren().length).toBe(0);
  });

  it('redo reapplies an undone change', () => {
    useStore.getState().addBlock('p', 'body-root');
    useStore.getState().undo();
    expect(bodyChildren().length).toBe(0);
    useStore.getState().redo();
    expect(bodyChildren().length).toBe(1);
  });

  it('a removed block can be recovered with undo', () => {
    useStore.getState().addBlock('h1', 'body-root');
    const childId = bodyChildren()[0].id;
    useStore.getState().removeBlock(childId);
    expect(bodyChildren().length).toBe(0);
    useStore.getState().undo();
    expect(bodyChildren().length).toBe(1);
  });

  it('undo is a no-op when there is no history', () => {
    useStore.getState().undo();
    expect(bodyChildren().length).toBe(0);
    expect(useStore.getState().astPast.length).toBe(0);
  });
});
