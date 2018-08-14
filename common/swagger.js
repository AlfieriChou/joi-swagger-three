const fs = require('fs')
const Joi = require('joi')
const convert = require('joi-to-json-schema')
const _ = require('lodash')

const generateSwagger = (modelPath = './model') => {
  // TODO 未考虑文件夹下嵌套文件夹
  const items = fs.readdirSync(modelPath)
  let methods = []
  let components = {}
  components.schemas = {}
  items.forEach(item => {
    let model = require('../model/' + item)
    item = item.replace(/\.\w+$/, '')
    let schemaName = item.slice(0, 1).toUpperCase() + item.slice(1)
    for (let index in model) {
      if (index === 'schema') {
        modelSchema = convert(model[index])
        let schema = {}
        schema[schemaName] = {
          'type' : 'object',
          'properties' : modelSchema.properties
        }
        components.schemas = _.merge(components.schemas, schema)
      } else {
        content = {
          tags: model[index].tags,
          summary: model[index].summary,
          description: model[index].description
        }

        if (model[index].query) {
          content.parameters = []
          params = convert(Joi.object(model[index].query))
          for (let prop in params.properties) {
            let field = {}
            field.name = prop
            field.in = 'query'
            field.description = model[index].summary
            field.schema = {
              'type' : params.properties[prop].type
            }
            field.required = false
            content.parameters.push(field)
          }
        }

        if (model[index].params) {
          content.parameters = []
          params = convert(Joi.object(model[index].params))
          for (let prop in params.properties) {
            let field = {}
            field.name = prop
            field.in = 'path'
            field.description = model[index].summary
            field.schema = {
              'type' : params.properties[prop].type
            }
            field.required = true
            content.parameters.push(field)
          }
        }

        if (model[index].headers) {
          content.parameters = []
          params = convert(Joi.object(model[index].headers))
          for (let prop in params.properties) {
            let field = {}
            field.name = prop
            field.in = 'header'
            field.description = model[index].summary
            field.items = {
              'type' : params.properties[prop].type
            }
            field.required = true
            content.parameters.push(field)
          }
        }

        if (model[index].requestBody) {
          params = convert(Joi.object(model[index].requestBody.body))
          let request = {}
          request.requestBody = {}
          let bodySchema = request.requestBody
          bodySchema.content = {
            "application/x-www-form-urlencoded" : {
              'schema': {
                'type' : params.type,
                'properties' : params.properties,
                'required': model[index].requestBody.required
              }
            }
          }
          content.requestBody = request.requestBody
        }

        content.responses = {
          200: {
            'description' : 'response success',
            'content' : {
              'application/json' : {
                'schema' : {
                  $ref: `#/components/schemas/${schemaName}`
                }
              }
            }
          }
        }

        let swaggerMethod = {}
        swaggerMethod[(model[index].method).toString()] = content
        
        let swaggerItem = {}
        swaggerItem[(model[index].path).toString()] = swaggerMethod
        methods.push(swaggerItem)
      }
    }
  })

  let mergeMethod = {}
  for (let i = 0; i < methods.length; ++i) {
    mergeMethod = _.merge(mergeMethod, methods[i])
  }

  let swagger = {}
  swagger.openapi = '3.0.0'
  swagger.info = {
    'title': 'API document',
    'version': 'v3'
  }
  swagger.paths = mergeMethod
  swagger.components = components
  return swagger
}

module.exports = {
  generateSwagger
}
