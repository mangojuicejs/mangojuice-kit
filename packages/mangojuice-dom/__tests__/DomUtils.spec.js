import Dom from 'mangojuice-dom';
import { runWithTracking } from 'mangojuice-test';
import { utils, logicOf, task } from 'mangojuice-core';


describe('DomUtils', () => {
  describe('#findDomNodes', () => {
    let elem;
    beforeEach(() => {
      elem = document.createElement('div');
      elem.id = 'test-id';
    });
    afterEach(() => {
      elem.remove();
    });

    it('should find DOM node instantly if exists', async () => {
      const Block = {
        Logic: class TestLogic {
          create() {
            return task(Dom.Tasks.findDomNodes)
              .args('#test-id')
              .success(this.foundNode);
          }
          foundNode = jest.fn()
        }
      };
      document.body.appendChild(elem);
      const { app, commands } = await runWithTracking({ app: Block });

      expect(commands).toMatchSnapshot();
      expect(app.proc.logic.foundNode.mock.calls).toMatchSnapshot();
    });

    it('should wait for DOM element to appear', async () => {
      const Block = {
        createModel: () => ({}),
        Logic: class TestLogic {
          create() {
            return task(Dom.Tasks.findDomNodes)
              .args('#test-id')
              .success(this.foundNode);
          }
          foundNode = jest.fn()
        }
      };
      const prom = runWithTracking({ app: Block });
      await utils.delay(250);
      document.body.appendChild(elem);
      await prom;

      expect(prom.commands).toMatchSnapshot();
      expect(prom.app.proc.logic.foundNode.mock.calls).toMatchSnapshot();
    });

    it('should return empty value if no element found', async () => {
      const Block = {
        createModel: () => ({}),
        Logic: class TestLogic {
          create() {
            return task(async function() {
              const { result } = await Dom.Tasks.findDomNodes('#test-id');
              return result;
            }).success(this.foundNode);
          }
          foundNode = jest.fn()
        }
      };
      const { app, commands } = await runWithTracking({ app: Block });

      expect(commands).toMatchSnapshot();
      expect(app.proc.logic.foundNode.mock.calls).toMatchSnapshot();
    });
  });

  describe('#focus', () => {
    let elem;
    beforeEach(() => {
      elem = document.createElement('div');
      for (let i = 0; i < 10; i++) {
        const input = document.createElement('input');
        input.className = 'input';
        input.id = `input-${i}`;
        elem.appendChild(input);
      }
    });
    afterEach(() => {
      elem.remove();
    });

    it('should focus first found element', async () => {
      const Block = {
        Logic: class TestLogic {
          create() {
            return task(Dom.Tasks.focus).args('.input');
          }
        }
      };
      document.body.appendChild(elem);
      const { app, commands } = await runWithTracking({ app: Block });

      expect(document.activeElement).toEqual(elem.children[0]);
    });

    it('should do nothing if no element found', async () => {
      const Block = {
        createModel: () => ({}),
        Logic: class TestLogic {
          create() {
            return task(Dom.Tasks.focus).args('.inputNotExists');
          }
        }
      };
      document.body.appendChild(elem);
      const { app, commands } = await runWithTracking({ app: Block });

      expect(document.activeElement).not.toEqual(elem.children[0]);
    });
  });

  describe('#blur', () => {
    let elem;
    beforeEach(() => {
      elem = document.createElement('div');
      for (let i = 0; i < 10; i++) {
        const input = document.createElement('input');
        input.className = 'input';
        input.id = `input-${i}`;
        elem.appendChild(input);
      }
    });
    afterEach(() => {
      elem.remove();
    });

    it('should blur first found element', async () => {
      const Block = {
        Logic: class TestLogic {
          create() {
            return task(Dom.Tasks.blur).args('.input');
          }
        }
      };

      document.body.appendChild(elem);
      elem.children[0].focus();
      expect(document.activeElement).toEqual(elem.children[0]);

      const { app, commands } = await runWithTracking({ app: Block });

      expect(document.activeElement).not.toEqual(elem.children[0]);
    });

    it('should do nothing if no element found', async () => {
      const Block = {
        Logic: class TestLogic {
          create() {
            return task(Dom.Tasks.blur).args('.inputNotExists');
          }
        }
      };

      document.body.appendChild(elem);
      elem.children[0].focus();
      const { app, commands } = await runWithTracking({ app: Block });

      expect(document.activeElement).toEqual(elem.children[0]);
    });
  })
})
