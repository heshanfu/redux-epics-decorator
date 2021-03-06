import React from 'react'
import { Store } from 'redux'
import * as enzyme from 'enzyme'
import { expect } from 'chai'
import * as Sinon from 'sinon'
import * as SinonChai from 'sinon-chai'
import { range } from 'lodash'

import { EffectModule, Effect } from '../../src'
import { setupStore, GlobalState } from '../fixtures/store'
import { Module1Container, Module1Props, createActionPayloadCreator, createActionMetaCreator } from '../fixtures/module1'
import { Module2Container, Module2Props } from '../fixtures/module2'
import { msgDelay } from '../fixtures/service'

chai.use(SinonChai)

describe('Effect specs', () => {
  let Module1Node: enzyme.ShallowWrapper<Module1Props, any>
  let Module2Node: enzyme.ShallowWrapper<Module2Props, any>
  let store: Store<GlobalState>
  const propsSpy = {} as any

  beforeEach(() => {
    store = setupStore()
    Module1Node = enzyme.shallow(<Module1Container store={ store } { ...propsSpy }/>)
    Module2Node = enzyme.shallow(<Module2Container store={ store } { ...propsSpy }/>)
  })

  afterEach(() => {
    Module1Node.unmount()
    Module2Node.unmount()
  })

  it('should define epics + reducer with @Effect', () => {
    const props = Module1Node.props()
    const clock = Sinon.useFakeTimers()
    props.getMsg()
    clock.tick(msgDelay)
    expect(store.getState().module1.allMsgs.length).to.equal(1)

    clock.restore()
  })

  it('should work fine with rx operators#exhaustMap', () => {
    const props = Module1Node.props()
    const clock = Sinon.useFakeTimers()
    // exhaustMap
    props.getMsg()
    props.getMsg()
    props.getMsg()
    props.getMsg()
    clock.tick(msgDelay)
    expect(store.getState().module1.allMsgs.length).to.equal(1)

    clock.restore()
  })

  it('should work fine with rx operators#mergeMap', () => {
    const props = Module2Node.props()
    const clock = Sinon.useFakeTimers()
    const count = 5
    // mergeMap
    range(0, count).forEach(() => props.getMsg())

    clock.tick(msgDelay)
    expect(store.getState().module2.allMsgs.length).to.equal(count)

    clock.restore()
  })

  it('should work fine with rx operators#takeUntil', () => {
    const props = Module2Node.props()
    const clock = Sinon.useFakeTimers()
    const count = 5
    // mergeMap
    range(0, count).forEach(() => props.getMsg())

    props.dispose()

    clock.tick(msgDelay)
    expect(store.getState().module2.allMsgs.length).to.equal(0)

    clock.restore()
  })

  it('should have ability to trigger another effect', () => {
    const props = Module2Node.props()

    const clock = Sinon.useFakeTimers()

    props.loadMsgs()

    clock.tick(msgDelay)

    expect(store.getState().module2.allMsgs.length).to.equal(10)

    clock.restore()
  })

  it('should have ability to trigger another reducer', () => {
    const props = Module2Node.props()

    const clock = Sinon.useFakeTimers()

    props.loadFiveMsgs()

    clock.tick(msgDelay)

    expect(store.getState().module2.allMsgs.length).to.equal(5)

    clock.restore()
  })

  it('should pass extra args to createAction', () => {
    const props = Module1Node.props()
    const clock = Sinon.useFakeTimers()

    props.noop()

    clock.tick(msgDelay)

    createActionPayloadCreator.should.have.been.called
    createActionMetaCreator.should.have.been.called

    createActionPayloadCreator.resetHistory()
    createActionMetaCreator.resetHistory()

    clock.restore()
  })

  it('should throw when Epic emit a undefined value', () => {
    const props = Module1Node.props()
    const spy = Sinon.spy(console, 'error')

    props.undefinedEpic()

    expect(spy.callCount).to.equal(1)

    spy.restore()
  })

  it('should warn when Epic emit a non action value', () => {
    const props = Module1Node.props()
    const spy = Sinon.spy(console, 'warn')

    props.nonActionEpic()

    expect(spy.callCount).to.equal(1)

    spy.restore()
  })

  it('should throw when module without namespace', () => {
    function defineModule() {
      class TestModule extends EffectModule<any> {
        defaultState = { foo: 1 }

        @Effect()
        foo(action$: any) {
          return action$
        }
      }

      return new TestModule
    }

    expect(defineModule).to.throw()
  })

})
