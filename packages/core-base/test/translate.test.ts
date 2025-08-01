/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-explicit-any */

import { baseCompile } from '@intlify/message-compiler'
import { ast } from './fixtures/ast'

// utils
import * as shared from '@intlify/shared'
vi.mock('@intlify/shared', async () => {
  const actual = await vi.importActual<object>('@intlify/shared')
  return {
    ...actual,
    warn: vi.fn()
  }
})

import { compile } from '../src/compilation'
import {
  createCoreContext as context,
  NOT_RESOLVED,
  registerLocaleFallbacker,
  registerMessageCompiler,
  registerMessageResolver
} from '../src/context'
import { CoreErrorCodes, errorMessages } from '../src/errors'
import { fallbackWithLocaleChain } from '../src/fallbacker'
import { resolveValue } from '../src/resolver'
import { translate } from '../src/translate'
import { createTextNode } from './helper'

import type {
  MessageContext,
  MessageFunctionReturn,
  MessageProcessor,
  MessageType
} from '../src/runtime'
import type { PickupKeys } from '../src/types/utils'
import type { VNode } from './helper'

beforeEach(() => {
  registerMessageCompiler(compile)
  registerMessageResolver(resolveValue)
  registerLocaleFallbacker(fallbackWithLocaleChain)
})

describe('features', () => {
  test('simple text', () => {
    const ctx = context({
      locale: 'en',
      messages: {
        en: { hi: 'hi kazupon !' }
      }
    })
    expect(translate(ctx, 'hi')).toEqual('hi kazupon !')
  })

  test('list', () => {
    const ctx = context({
      locale: 'en',
      messages: {
        en: { hi: 'hi {0} !', nest: { foo: '' } }
      }
    })
    expect(translate(ctx, 'hi', ['kazupon'])).toEqual('hi kazupon !')
  })

  test('named', () => {
    const ctx = context({
      locale: 'en',
      messages: {
        en: { hi: 'hi {name} !' }
      }
    })
    expect(translate(ctx, 'hi', { name: 'kazupon' })).toEqual('hi kazupon !')
  })

  test('linked', () => {
    const ctx = context({
      locale: 'en',
      messages: {
        en: {
          name: 'kazupon',
          hi: 'hi @.upper:name !'
        }
      }
    })
    expect(translate(ctx, 'hi')).toEqual('hi KAZUPON !')
  })

  test('plural', () => {
    const ctx = context({
      locale: 'en',
      messages: {
        en: { apple: 'no apples | one apple | {count} apples' }
      }
    })
    expect(translate(ctx, 'apple', 0)).toEqual('no apples')
    expect(translate(ctx, 'apple', 1)).toEqual('one apple')
    expect(translate(ctx, 'apple', 10)).toEqual('10 apples')
    expect(translate(ctx, 'apple', { count: 20 }, 10)).toEqual('20 apples')
  })
})

describe('locale option', () => {
  test('specify', () => {
    const ctx = context({
      locale: 'en',
      messages: {
        en: { hi: 'hi kazupon !' },
        ja: { hi: 'こんにちは　かずぽん！' }
      }
    })
    expect(translate(ctx, 'hi', {}, { locale: 'ja' })).toEqual(
      'こんにちは　かずぽん！'
    )
  })
})

describe('default option', () => {
  test('string message', () => {
    const ctx = context({
      locale: 'en',
      messages: {
        en: {}
      }
    })
    expect(translate(ctx, 'hello', 'hello, default message!')).toEqual(
      'hello, default message!'
    )
    expect(translate(ctx, 'hello', '')).toEqual('')
  })

  test('boolean true', () => {
    const ctx = context({
      locale: 'en',
      messages: {
        en: {}
      }
    })
    expect(
      translate(ctx, 'hi {name}!', { name: 'kazupon' }, { default: true })
    ).toEqual('hi kazupon!')
  })
})

describe('context fallbackLocale option', () => {
  test('false', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      fallbackLocale: false,
      messages: {
        en: {}
      }
    })

    expect(translate(ctx, 'hello')).toEqual('hello')
    expect(mockWarn.mock.calls[0][0]).toEqual(
      `Not found 'hello' key in 'en' locale messages.`
    )
  })

  test('string', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      fallbackLocale: 'ja',
      messages: {
        en: {},
        ja: {
          hello: 'こんにちは！'
        }
      }
    })

    expect(translate(ctx, 'hello')).toEqual('こんにちは！')
    expect(mockWarn.mock.calls[0][0]).toEqual(
      `Not found 'hello' key in 'en' locale messages.`
    )
  })

  test('array', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      fallbackLocale: ['ja'],
      messages: {
        en: {},
        ja: {
          hello: 'こんにちは！'
        }
      }
    })

    expect(translate(ctx, 'hello')).toEqual('こんにちは！')
    expect(mockWarn.mock.calls[0][0]).toEqual(
      `Not found 'hello' key in 'en' locale messages.`
    )
  })
})

describe('context missing option', () => {
  test('not specified missing handler', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      messages: {
        en: {}
      }
    })

    expect(translate(ctx, 'hello')).toEqual('hello')
    expect(mockWarn.mock.calls[0][0]).toEqual(
      `Not found 'hello' key in 'en' locale messages.`
    )
  })

  test('specified missing handler', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      missing: (c, locale, key) => {
        expect(c).toEqual(ctx)
        expect(locale).toEqual('en')
        expect(key).toEqual('hello')
        return 'HELLO'
      },
      messages: {
        en: {}
      }
    })
    expect(translate(ctx, 'hello')).toEqual('HELLO')
    expect(mockWarn).not.toHaveBeenCalled()
  })
})

describe('context missingWarn option', () => {
  test('false', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      fallbackWarn: false,
      missingWarn: false,
      messages: {
        en: {}
      }
    })

    expect(translate(ctx, 'hello')).toEqual('hello')
    expect(mockWarn).not.toHaveBeenCalled()
  })

  test('regex', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      fallbackWarn: false,
      missingWarn: /^hi/,
      messages: {
        en: {}
      }
    })

    expect(translate(ctx, 'hi kazupon!')).toEqual('hi kazupon!')
    expect(translate(ctx, 'hello')).toEqual('hello')
    expect(mockWarn).toHaveBeenCalledTimes(1)
    expect(mockWarn.mock.calls[0][0]).not.toEqual(
      `Not found 'hello' key in 'en' locale messages.`
    )
  })

  test('missingWarn option', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      fallbackWarn: false,
      messages: {
        en: {}
      }
    })

    expect(translate(ctx, 'hello', {}, { missingWarn: false })).toEqual('hello')
    expect(mockWarn).not.toHaveBeenCalled()
  })
})

describe('context fallbackWarn option', () => {
  test('not specify fallbackLocale', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      missingWarn: false,
      messages: {
        en: {}
      }
    })

    expect(translate(ctx, 'hello')).toEqual('hello')
    expect(mockWarn).not.toHaveBeenCalled()
  })

  test('specify fallbackLocale', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      fallbackLocale: ['ja'],
      missingWarn: false,
      messages: {
        en: {},
        ja: {
          hello: 'こんにちは！'
        }
      }
    })

    expect(translate(ctx, 'hello')).toEqual('こんにちは！')
    expect(mockWarn).toHaveBeenCalled()
    expect(mockWarn.mock.calls[0][0]).toEqual(
      `Fall back to translate 'hello' key with 'ja' locale.`
    )
  })

  test('not found fallback message', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      fallbackLocale: ['ja', 'fr'],
      missingWarn: false,
      messages: {
        en: {},
        ja: {}
      }
    })

    expect(translate(ctx, 'hello.world')).toEqual('hello.world')
    expect(mockWarn).toHaveBeenCalledTimes(2)
    expect(mockWarn.mock.calls[0][0]).toEqual(
      `Fall back to translate 'hello.world' key with 'ja' locale.`
    )
    expect(mockWarn.mock.calls[1][0]).toEqual(
      `Fall back to translate 'hello.world' key with 'fr' locale.`
    )
  })

  test('context option: false', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      fallbackLocale: ['ja', 'fr'],
      missingWarn: false,
      fallbackWarn: false,
      messages: {
        en: {},
        ja: {}
      }
    })

    expect(translate(ctx, 'hello.world')).toEqual('hello.world')
    expect(mockWarn).toHaveBeenCalledTimes(0)
  })

  test('context option: regex', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      fallbackLocale: ['ja', 'fr'],
      missingWarn: false,
      fallbackWarn: /^hello/,
      messages: {
        en: {},
        ja: {}
      }
    })

    expect(translate(ctx, 'hello.world')).toEqual('hello.world')
    expect(mockWarn).toHaveBeenCalledTimes(2)
  })

  test('specify fallbackWarn option to translate function', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      fallbackLocale: ['ja'],
      missingWarn: false,
      messages: {
        en: {},
        ja: {
          hello: 'こんにちは！'
        }
      }
    })

    expect(translate(ctx, 'hello')).toEqual('こんにちは！')
    expect(translate(ctx, 'hi', {}, { fallbackWarn: false })).toEqual('hi')
    expect(mockWarn).toHaveBeenCalledTimes(1)
  })
})

describe('context fallbackFormat option', () => {
  test('specify true', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      fallbackLocale: ['ja', 'fr'],
      fallbackFormat: true,
      messages: {
        en: {},
        ja: {},
        fr: {}
      }
    })

    expect(translate(ctx, 'hi, {name}!', { name: 'kazupon' })).toEqual(
      'hi, kazupon!'
    )
    expect(mockWarn).toHaveBeenCalledTimes(5)
    expect(mockWarn.mock.calls[0][0]).toEqual(
      `Not found 'hi, {name}!' key in 'en' locale messages.`
    )
    expect(mockWarn.mock.calls[1][0]).toEqual(
      `Fall back to translate 'hi, {name}!' key with 'ja' locale.`
    )
    expect(mockWarn.mock.calls[2][0]).toEqual(
      `Not found 'hi, {name}!' key in 'ja' locale messages.`
    )
    expect(mockWarn.mock.calls[3][0]).toEqual(
      `Fall back to translate 'hi, {name}!' key with 'fr' locale.`
    )
    expect(mockWarn.mock.calls[4][0]).toEqual(
      `Not found 'hi, {name}!' key in 'fr' locale messages.`
    )
  })

  test('overridden with default option', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      fallbackLocale: ['ja', 'fr'],
      fallbackFormat: true,
      messages: {
        en: {},
        ja: {},
        fr: {}
      }
    })

    expect(
      translate(ctx, 'hi, {name}!', { name: 'kazupon' }, 'hello, {name}!')
    ).toEqual('hello, kazupon!')
    expect(mockWarn).toHaveBeenCalledTimes(5)
    expect(mockWarn.mock.calls[0][0]).toEqual(
      `Not found 'hi, {name}!' key in 'en' locale messages.`
    )
    expect(mockWarn.mock.calls[1][0]).toEqual(
      `Fall back to translate 'hi, {name}!' key with 'ja' locale.`
    )
    expect(mockWarn.mock.calls[2][0]).toEqual(
      `Not found 'hi, {name}!' key in 'ja' locale messages.`
    )
    expect(mockWarn.mock.calls[3][0]).toEqual(
      `Fall back to translate 'hi, {name}!' key with 'fr' locale.`
    )
    expect(mockWarn.mock.calls[4][0]).toEqual(
      `Not found 'hi, {name}!' key in 'fr' locale messages.`
    )
  })

  test('fallbackLocales is nothing', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      fallbackFormat: true,
      messages: {
        en: {}
      }
    })

    expect(
      translate(ctx, 'hi, {name}!', { name: 'kazupon' }, 'hello, {name}!')
    ).toEqual('hello, kazupon!')
    expect(mockWarn).toHaveBeenCalledTimes(1)
    expect(mockWarn.mock.calls[0][0]).toEqual(
      `Not found 'hi, {name}!' key in 'en' locale messages.`
    )
  })

  test('runtimeOnly', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      fallbackFormat: true,
      messages: {
        en: {}
      }
    })
    ctx.messageCompiler = null

    expect(translate(ctx, 'hi, {name}!', { name: 'kazupon' })).toEqual(
      'hi, {name}!'
    )
    expect(mockWarn).toHaveBeenCalledTimes(1)
    expect(mockWarn.mock.calls[0][0]).toEqual(
      `Not found 'hi, {name}!' key in 'en' locale messages.`
    )
  })
})

describe('context unresolving option', () => {
  test('fallbackWarn is truth', () => {
    const ctx = context({
      locale: 'en',
      fallbackLocale: ['ja', 'fr'],
      missingWarn: false,
      fallbackWarn: /^hello/,
      unresolving: true,
      messages: {
        en: {},
        ja: {}
      }
    })
    expect(translate(ctx, 'hello.world')).toEqual(NOT_RESOLVED)
  })

  test('fallbackWarn is false', () => {
    const ctx = context({
      locale: 'en',
      fallbackLocale: ['ja', 'fr'],
      missingWarn: false,
      fallbackWarn: false,
      unresolving: true,
      messages: {
        en: {},
        ja: {}
      }
    })
    expect(translate(ctx, 'hello.world')).toEqual(NOT_RESOLVED)
  })

  test('fallbackFormat is true', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      fallbackLocale: ['ja', 'fr'],
      fallbackFormat: true,
      unresolving: true,
      messages: {
        en: {},
        ja: {}
      }
    })
    expect(translate(ctx, 'hi, {name}!', { name: 'kazupon' })).toEqual(
      'hi, kazupon!'
    )
  })
})

describe('context pluralRule option', () => {
  test('basic', () => {
    const pluralRules = {
      ru: (choice: number, choicesLength: number) => {
        if (choice === 0) {
          return 0
        }

        const teen = choice > 10 && choice < 20
        const endsWithOne = choice % 10 === 1
        if (!teen && endsWithOne) {
          return 1
        }
        if (!teen && choice % 10 >= 2 && choice % 10 <= 4) {
          return 2
        }

        return choicesLength < 4 ? 2 : 3
      }
    }
    const ctx = context({
      locale: 'ru',
      pluralRules,
      messages: {
        ru: {
          car: '0 машин | {n} машина | {n} машины | {n} машин'
        }
      }
    })
    expect(translate(ctx, 'car', 1)).toEqual('1 машина')
    expect(translate(ctx, 'car', 2)).toEqual('2 машины')
    expect(translate(ctx, 'car', 4)).toEqual('4 машины')
    expect(translate(ctx, 'car', 12)).toEqual('12 машин')
    expect(translate(ctx, 'car', 21)).toEqual('21 машина')
  })
})

describe('context postTranslation option', () => {
  test('basic', () => {
    let key = ''
    const postTranslation = (
      str: MessageFunctionReturn<string>,
      _key: string
    ) => {
      key = _key
      return str.trim()
    }
    const ctx = context({
      locale: 'en',
      postTranslation,
      messages: {
        en: {
          hello: ' hello world! '
        }
      }
    })
    expect(translate(ctx, 'hello')).toEqual('hello world!')
    expect(key).toEqual('hello')
  })
})

describe('warnHtmlMessage', () => {
  test('default', () => {
    const mockWarn = vi.spyOn(shared, 'warn')
    mockWarn.mockImplementation(() => {})

    const ctx = context({
      locale: 'en',
      messages: {
        en: {
          hello: '<p>hello</p>'
        }
      }
    })

    expect(translate(ctx, 'hello')).toEqual('<p>hello</p>')
    expect(mockWarn).toHaveBeenCalled()
  })
})

describe('escapeParameter', () => {
  test('context option', () => {
    const ctx = context({
      locale: 'en',
      warnHtmlMessage: false,
      escapeParameter: true,
      messages: {
        en: {
          hello: 'hello, {name}!'
        }
      }
    })

    expect(translate(ctx, 'hello', { name: '<b>kazupon</b>' })).toEqual(
      'hello, &lt;b&gt;kazupon&lt;/b&gt;!'
    )
  })

  test('override with params', () => {
    const ctx = context({
      locale: 'en',
      warnHtmlMessage: false,
      escapeParameter: false,
      messages: {
        en: {
          hello: 'hello, {0}!'
        }
      }
    })

    expect(
      translate(ctx, 'hello', ['<b>kazupon</b>'], { escapeParameter: true })
    ).toEqual('hello, &lt;b&gt;kazupon&lt;/b&gt;!')
  })

  test('no escape', () => {
    const ctx = context({
      locale: 'en',
      warnHtmlMessage: false,
      escapeParameter: false,
      messages: {
        en: {
          hello: 'hello, {name}!'
        }
      }
    })

    expect(translate(ctx, 'hello', { name: '<b>kazupon</b>' })).toEqual(
      'hello, <b>kazupon</b>!'
    )
  })
})

describe('error', () => {
  test(errorMessages[CoreErrorCodes.INVALID_ARGUMENT], () => {
    const ctx = context({
      locale: 'ja',
      messages: {
        ja: {}
      }
    })
    expect(() => {
      translate(ctx, {} as any)
    }).toThrowError(errorMessages[CoreErrorCodes.INVALID_ARGUMENT])
  })
})

test('resolvedMessage', () => {
  const ctx = context({
    locale: 'en',
    messages: {
      en: {}
    }
  })
  expect(translate(ctx, 'car', 1, { resolvedMessage: true })).toEqual('car')
  expect(
    translate(ctx, () => 'hello!', 1, {
      resolvedMessage: true
    })
  ).toEqual('hello!')
  expect(translate(ctx, 'list {0}', [1], { resolvedMessage: true })).toEqual(
    'list 1'
  )
  expect(
    translate(ctx, (ctx: MessageContext) => `list ${ctx.list(0)}`, [1], {
      resolvedMessage: true
    })
  ).toEqual('list 1')
  expect(
    translate(ctx, 'named {name}', { name: 'dio' }, { resolvedMessage: true })
  ).toEqual('named dio')
  expect(
    translate(
      ctx,
      (ctx: MessageContext) => `named ${ctx.named('name')}`,
      { name: 'dio' },
      { resolvedMessage: true }
    )
  ).toEqual('named dio')
})

const ErrorCodes = {
  CODE1: 1
} as const

type ErrorCodes = (typeof ErrorCodes)[keyof typeof ErrorCodes]

describe('edge cases', () => {
  test('multi bytes key', () => {
    const ctx = context({
      locale: 'ja',
      messages: {
        ja: {
          こんにちは: 'こんにちは！'
        }
      }
    })
    expect(translate(ctx, 'こんにちは')).toEqual('こんにちは！')
  })

  test('object path key', () => {
    const ctx = context({
      locale: 'en',
      messages: {
        en: {
          'side.left': 'Left'
        }
      }
    })
    expect(translate(ctx, 'side.left')).toEqual('Left')
  })

  test('computed property name', () => {
    const ctx = context({
      locale: 'en',
      messages: {
        en: {
          [ErrorCodes.CODE1]: 'error code1'
        }
      }
    })
    expect(translate(ctx, ErrorCodes.CODE1)).toEqual('error code1')
  })
})

describe('fallback context', () => {
  test('root (parent context)', () => {
    const parent = context({
      locale: 'en',
      messages: {
        en: { hello: 'hello man!', hi: 'hi' }
      }
    })

    const ctx = context({
      locale: 'en',
      messages: {
        en: { hi: 'hi! @:hello' }
      }
    })
    ctx.fallbackContext = parent

    expect(translate(ctx, 'hi')).toEqual('hi! hello man!')
  })

  test('local (self context)', () => {
    const ctx = context({
      locale: 'en',
      messages: {
        en: {
          apples: 'Apples',
          no_results: 'No @.lower:{0} found'
        },
        'en-variant': {
          no_results: 'No @.lower:{0} found'
        }
      }
    })

    expect(translate(ctx, 'no_results', ['apples'])).toEqual('No apples found')
    expect(
      translate(ctx, 'no_results', ['apples'], { locale: 'en-variant' })
    ).toEqual('No apples found')
  })
})

describe('processor', () => {
  // VNode processor
  function normalize(
    values: MessageType<string | VNode>[]
  ): MessageType<VNode>[] {
    return values.map(val =>
      shared.isString(val) || shared.isNumber(val) || shared.isBoolean(val)
        ? createTextNode(String(val))
        : val
    )
  }
  const interpolate = (val: unknown): MessageType<VNode> => val as VNode
  const processor = {
    normalize,
    interpolate,
    type: 'vnode'
  } as MessageProcessor<VNode>

  test('basic', () => {
    const ctx = context<VNode>({
      locale: 'en',
      messages: {
        en: { hi: 'hi kazupon !' }
      }
    })
    ctx.processor = processor
    expect(
      // @ts-expect-error -- FIXME
      translate<typeof ctx, string, PickupKeys<typeof ctx.messages>, VNode>(
        ctx,
        'hi'
      )
    ).toEqual([{ __v_isVNode: true, children: 'hi kazupon !' }])
  })

  test('list', () => {
    const ctx = context<VNode>({
      locale: 'en',
      messages: {
        en: { hi: 'hi {0} !', nest: { foo: '' } }
      }
    })
    ctx.processor = processor
    expect(
      // @ts-expect-error -- FIXME
      translate<typeof ctx, string, PickupKeys<typeof ctx.messages>, VNode>(
        ctx,
        'hi',
        ['kazupon']
      )
    ).toEqual([
      { __v_isVNode: true, children: 'hi ' },
      { __v_isVNode: true, children: 'kazupon' },
      { __v_isVNode: true, children: ' !' }
    ])
  })

  test('named', () => {
    const ctx = context<VNode>({
      locale: 'en',
      messages: {
        en: { hi: 'hi {name} !' }
      }
    })
    ctx.processor = processor
    expect(
      // @ts-expect-error -- FIXME
      translate<typeof ctx, string, PickupKeys<typeof ctx.messages>, VNode>(
        ctx,
        'hi',
        { name: 'kazupon' }
      )
    ).toEqual([
      { __v_isVNode: true, children: 'hi ' },
      { __v_isVNode: true, children: 'kazupon' },
      { __v_isVNode: true, children: ' !' }
    ])
  })

  test('linked', () => {
    const ctx = context<VNode>({
      locale: 'en',
      messages: {
        en: {
          name: 'kazupon',
          hi: 'hi @.upper:name !'
        }
      }
    })
    ctx.processor = processor
    expect(
      // @ts-expect-error -- FIXME
      translate<typeof ctx, string, PickupKeys<typeof ctx.messages>, VNode>(
        ctx,
        'hi'
      )
    ).toEqual([
      { __v_isVNode: true, children: 'hi ' },
      { __v_isVNode: true, children: 'KAZUPON' },
      { __v_isVNode: true, children: ' !' }
    ])
  })

  test('plural', () => {
    const ctx = context<VNode>({
      locale: 'en',
      messages: {
        en: { apple: 'no apples | one apple | {count} apples from {name}' }
      }
    })
    ctx.processor = processor
    expect(
      // @ts-expect-error -- FIXME
      translate<typeof ctx, string, PickupKeys<typeof ctx.messages>, VNode>(
        ctx,
        'apple',
        0
      )
    ).toEqual([{ __v_isVNode: true, children: 'no apples' }])
    expect(
      // @ts-expect-error -- FIXME
      translate<typeof ctx, string, PickupKeys<typeof ctx.messages>, VNode>(
        ctx,
        'apple',
        1
      )
    ).toEqual([{ __v_isVNode: true, children: 'one apple' }])
    expect(
      // @ts-expect-error -- FIXME
      translate<typeof ctx, string, PickupKeys<typeof ctx.messages>, VNode>(
        ctx,
        'apple',
        10
      )
    ).toEqual([
      { __v_isVNode: true, children: '10' },
      { __v_isVNode: true, children: ' apples from ' },
      undefined
    ])
    expect(
      // @ts-expect-error -- FIXME
      translate<typeof ctx, string, PickupKeys<typeof ctx.messages>, VNode>(
        ctx,
        'apple',
        { count: 20, name: 'kazupon' },
        10
      )
    ).toEqual([
      { __v_isVNode: true, children: '20' },
      { __v_isVNode: true, children: ' apples from ' },
      { __v_isVNode: true, children: 'kazupon' }
    ])
  })
})

describe('AST passing', () => {
  test('simple text', () => {
    const msg = 'hi kazupon !'
    const { ast } = baseCompile(msg, { jit: true, location: false })

    const ctx = context({
      locale: 'en',
      messages: {
        en: { hi: ast }
      }
    })
    expect(translate(ctx, 'hi')).toEqual('hi kazupon !')
  })

  test('json path key', () => {
    const ctx = context({
      locale: 'en',
      messages: {
        en: ast
      }
    })
    expect(translate(ctx, 'languages')).toEqual('languages')
    expect(translate(ctx, 'product')).toEqual('Product')
    expect(translate(ctx, 'product.type')).toEqual('Product type')
    expect(translate(ctx, 'product.test.type')).toEqual('Product test type')
  })
})

test('locale detector', () => {
  const locale = vi.fn().mockImplementation(() => 'en')
  const ctx = context({
    locale,
    messages: {
      en: { hi: 'hi kazupon !' },
      ja: { hi: 'こんにちは　かずぽん！' }
    }
  })
  expect(translate(ctx, 'hi')).toEqual('hi kazupon !')
  expect(translate(ctx, 'hi')).toEqual('hi kazupon !')
  expect(locale).toHaveBeenCalledTimes(2)
})
