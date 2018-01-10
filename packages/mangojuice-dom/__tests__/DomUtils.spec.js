import Dom from 'mangojuice-dom';
import { runWithTracking } from 'mangojuice-test';
import { delay, logicOf, cmd, task } from 'mangojuice-core';


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
        createModel: () => ({}),
        Logic: class TestLogic {
          @cmd FindNode() {
            return task(Dom.Tasks.findDomNodes)
              .args('#test-id')
              .success(this.FoundNode);
          }
          @cmd FoundNode() {}
        }
      };
      document.body.appendChild(elem);
      const { app, commands } = await runWithTracking({ app: Block });
      const prom = app.proc.exec(logicOf(app.model).FindNode);
      const res = await prom;

      expect(commands).toHaveLength(2);
      expect(commands[1].args[0]).toHaveLength(1);
      expect(commands[1].args[0][0]).toEqual(elem);
    });

    it('should wait for DOM element to appear', async () => {
      const Block = {
        createModel: () => ({}),
        Logic: class TestLogic {
          @cmd FindNode() {
            return task(Dom.Tasks.findDomNodes)
              .args('#test-id')
              .success(this.FoundNode);
          }
          @cmd FoundNode() {}
        }
      };
      const { app, commands } = await runWithTracking({ app: Block });
      const prom = app.proc.exec(logicOf(app.model).FindNode);
      await delay(250);
      document.body.appendChild(elem);
      const res = await prom;

      expect(commands).toHaveLength(2);
      expect(commands[1].args[0]).toHaveLength(1);
      expect(commands[1].args[0][0]).toEqual(elem);
    });

    it('should return empty value if no element found', async () => {
      const Block = {
        createModel: () => ({}),
        Logic: class TestLogic {
          @cmd FindNode() {
            return task(async function() {
              const { result } = await this.call(Dom.Tasks.findDomNodes, '#test-id');
              return result;
            }).success(this.FoundNode);
          }
          @cmd FoundNode() {}
        }
      };
      const { app, commands } = await runWithTracking({ app: Block });
      const res = await app.proc.exec(logicOf(app.model).FindNode);

      expect(commands).toHaveLength(2);
      expect(commands[1].args[0]).toHaveLength(0);
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
        createModel: () => ({}),
        Logic: class TestLogic {
          @cmd FindNode() {
            return task(Dom.Tasks.focus).args('.input');
          }
        }
      };
      document.body.appendChild(elem);
      const { app, commands } = await runWithTracking({ app: Block });
      await app.proc.exec(logicOf(app.model).FindNode);

      expect(document.activeElement).toEqual(elem.children[0]);
    });

    it('should do nothing if no element found', async () => {
      const Block = {
        createModel: () => ({}),
        Logic: class TestLogic {
          @cmd FindNode() {
            return task(Dom.Tasks.focus).args('.inputNotExists');
          }
        }
      };
      document.body.appendChild(elem);
      const { app, commands } = await runWithTracking({ app: Block });
      await app.proc.exec(logicOf(app.model).FindNode);

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
        createModel: () => ({}),
        Logic: class TestLogic {
          @cmd FindNode() {
            return task(Dom.Tasks.blur).args('.input');
          }
        }
      };

      document.body.appendChild(elem);
      elem.children[0].focus();
      expect(document.activeElement).toEqual(elem.children[0]);

      const { app, commands } = await runWithTracking({ app: Block });
      await app.proc.exec(logicOf(app.model).FindNode);

      expect(document.activeElement).not.toEqual(elem.children[0]);
    });

    it('should do nothing if no element found', async () => {
      const Block = {
        createModel: () => ({}),
        Logic: class TestLogic {
          @cmd FindNode() {
            return task(Dom.Tasks.blur).args('.inputNotExists');
          }
        }
      };

      document.body.appendChild(elem);
      elem.children[0].focus();
      const { app, commands } = await runWithTracking({ app: Block });
      await app.proc.exec(logicOf(app.model).FindNode);

      expect(document.activeElement).toEqual(elem.children[0]);
    });
  })
})
