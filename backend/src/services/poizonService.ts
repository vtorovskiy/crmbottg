// backend/src/services/poizonService.ts
import axios from 'axios'
import { logger } from '@/utils/logger'

interface ExtractSpuResponse {
  success: boolean
  spu_id?: string
  error?: string
}

interface ProductDataResponse {
  success: boolean
  product?: {
    id: string
    title: string
    vendor_url: string
    spu: string
    available: boolean
    price_min: string
    price: string
    image: {
      src: string
      width: number
      height: number
      alt: string
      aspect_ratio: number
    }
    options: Array<{
      id: string
      name: string
      position: number
      values: string[]
    }>
    variants: Array<{
      id: string
      title: string
      inventory_quantity: number
      sku: string
      position: number
      option1: string
      option2: string
      price: string
      available: boolean
      options: Array<{
        name: string
        value: string
      }>
    }>
    images: Array<{
      src: string
      width: number
      height: number
      alt: string
      aspect_ratio: number
    }>
  }
  error?: string
}

class PoizonService {
  private extractSpuUrl: string
  private getProductDataUrl: string
  private timeout: number

  constructor() {
    this.extractSpuUrl = process.env.POIZON_EXTRACT_SPU_URL || 'http://5.129.196.215:8001/extract-spu'
    this.getProductDataUrl = process.env.POIZON_PRODUCT_DATA_URL || 'http://5.129.196.215:8002/get-product-data'
    this.timeout = 30000 // 30 секунд
  }

  /**
   * Извлекает SPU ID из ссылки POIZON
   * @param url - ссылка на товар POIZON
   * @returns SPU ID или null в случае ошибки
   */
  async extractSpu(url: string): Promise<string | null> {
    try {
      logger.info('Extracting SPU from POIZON URL', { url: url.substring(0, 100) })

      const response = await axios.post<ExtractSpuResponse>(
        this.extractSpuUrl,
        { url },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SQUARE-Bot/1.0'
          }
        }
      )

      if (response.data.success && response.data.spu_id) {
        logger.info('SPU extracted successfully', {
          spu_id: response.data.spu_id,
          url: url.substring(0, 50)
        })
        return response.data.spu_id
      } else {
        logger.warn('Failed to extract SPU', {
          error: response.data.error,
          url: url.substring(0, 50)
        })
        return null
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('POIZON API error during SPU extraction', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          url: url.substring(0, 50)
        })
      } else {
        logger.error('Unexpected error during SPU extraction', error, {
          url: url.substring(0, 50)
        })
      }
      return null
    }
  }

  /**
   * Получает данные о товаре по SPU ID
   * @param spuId - SPU ID товара
   * @returns данные товара или null в случае ошибки
   */
  async getProductData(spuId: string): Promise<ProductDataResponse['product'] | null> {
    try {
      logger.info('Getting product data from POIZON', { spu_id: spuId })

      const response = await axios.post<ProductDataResponse>(
        this.getProductDataUrl,
        { spu_id: spuId },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SQUARE-Bot/1.0'
          }
        }
      )

      if (response.data.success && response.data.product) {
        const product = response.data.product

        logger.info('Product data retrieved successfully', {
          spu_id: spuId,
          title: product.title,
          variants_count: product.variants?.length || 0,
          available: product.available
        })

        // Валидируем структуру данных
        if (!this.validateProductData(product)) {
          logger.warn('Product data validation failed', { spu_id: spuId })
          return null
        }

        return product
      } else {
        logger.warn('Failed to get product data', {
          error: response.data.error,
          spu_id: spuId
        })
        return null
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('POIZON API error during product data retrieval', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          spu_id: spuId
        })
      } else {
        logger.error('Unexpected error during product data retrieval', error, {
          spu_id: spuId
        })
      }
      return null
    }
  }

  /**
   * Валидирует структуру данных о товаре
   * @param product - данные товара для валидации
   * @returns true если данные корректны
   */
  private validateProductData(product: any): boolean {
    try {
      // Проверяем обязательные поля
      if (!product || typeof product !== 'object') {
        return false
      }

      const requiredFields = ['id', 'title', 'spu']
      for (const field of requiredFields) {
        if (!product[field]) {
          logger.warn('Missing required field in product data', { field })
          return false
        }
      }

      // Проверяем наличие вариантов
      if (!Array.isArray(product.variants) || product.variants.length === 0) {
        logger.warn('Product has no variants', { spu: product.spu })
        return false
      }

      // Проверяем структуру вариантов
      for (const variant of product.variants) {
        if (!variant.id || !variant.price) {
          logger.warn('Invalid variant structure', {
            variant_id: variant.id,
            spu: product.spu
          })
          return false
        }

        // Проверяем что цена является числом
        const price = parseFloat(variant.price)
        if (isNaN(price) || price <= 0) {
          logger.warn('Invalid variant price', {
            variant_id: variant.id,
            price: variant.price,
            spu: product.spu
          })
          return false
        }
      }

      // Проверяем изображения
      if (product.image && product.image.src) {
        // Нормализуем URL изображения
        if (product.image.src.startsWith('//')) {
          product.image.src = `https:${product.image.src}`
        }
      }

      return true
    } catch (error) {
      logger.error('Error validating product data', error)
      return false
    }
  }

  /**
   * Парсит ссылку POIZON из текста с китайскими символами
   * @param text - текст содержащий ссылку
   * @returns найденная ссылка или null
   */
  static parsePoizonUrl(text: string): string | null {
    try {
      // RegExp для извлечения URL из китайского текста
      const urlRegex = /https?:\/\/[^\s\u4e00-\u9fff]+/gi
      const urls = text.match(urlRegex)

      if (!urls || urls.length === 0) {
        return null
      }

      // Берем первую найденную ссылку
      const url = urls[0]

      // Проверяем что это ссылка на POIZON/得物
      const poizonDomains = [
        'dw4.co',
        'dewu.com',
        'poizon.com',
        '得物.com'
      ]

      const isPoizonUrl = poizonDomains.some(domain =>
        url.toLowerCase().includes(domain.toLowerCase())
      )

      if (!isPoizonUrl) {
        logger.warn('URL is not from POIZON', { url: url.substring(0, 50) })
        return null
      }

      logger.info('POIZON URL parsed successfully', { url: url.substring(0, 50) })
      return url
    } catch (error) {
      logger.error('Error parsing POIZON URL', error)
      return null
    }
  }

  /**
   * Получает статистику использования API
   * @returns статистика вызовов API
   */
  async getApiStats(): Promise<{
    extractSpuCalls: number
    productDataCalls: number
    totalCalls: number
  }> {
    // В реальности эта информация должна браться из базы данных
    // Здесь просто заглушка для демонстрации
    return {
      extractSpuCalls: 0,
      productDataCalls: 0,
      totalCalls: 0
    }
  }

  /**
   * Проверяет доступность POIZON API
   * @returns true если API доступно
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Делаем простой запрос для проверки доступности
      const testResponse = await axios.get(this.extractSpuUrl.replace('/extract-spu', '/health'), {
        timeout: 5000
      }).catch(() => ({ status: 0 }))

      const isHealthy = testResponse.status === 200

      logger.info('POIZON API health check', {
        extractSpuUrl: this.extractSpuUrl,
        productDataUrl: this.getProductDataUrl,
        healthy: isHealthy
      })

      return isHealthy
    } catch (error) {
      logger.error('POIZON API health check failed', error)
      return false
    }
  }

  /**
   * Форматирует цену в читаемый вид
   * @param price - цена в юанях (строка)
   * @returns отформатированная цена
   */
  static formatPrice(price: string): string {
    const numPrice = parseFloat(price)
    if (isNaN(numPrice)) return '0¥'

    return `${numPrice.toLocaleString('zh-CN', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 2 
    })}¥`
  }

  /**
   * Получает доступные размеры из данных товара
   * @param product - данные товара
   * @returns массив доступных размеров
   */
  static getAvailableSizes(product: ProductDataResponse['product']): Array<{
    id: string
    size: string
    price: number
    available: boolean
  }> {
    if (!product || !product.variants) return []

    return product.variants
      .filter(variant => variant.available && variant.inventory_quantity > 0)
      .map(variant => ({
        id: variant.id,
        size: variant.option2 || variant.options?.find(o => o.name === 'Size')?.value || 'N/A',
        price: parseFloat(variant.price),
        available: variant.available
      }))
      .sort((a, b) => {
        // Пытаемся сортировать по числовому значению размера
        const aNum = parseFloat(a.size)
        const bNum = parseFloat(b.size)

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum
        }

        // Если не числовые, сортируем по алфавиту
        return a.size.localeCompare(b.size)
      })
  }

  /**
   * Получает цвета товара
   * @param product - данные товара
   * @returns массив доступных цветов
   */
  static getAvailableColors(product: ProductDataResponse['product']): string[] {
    if (!product || !product.variants) return []

    const colors = new Set<string>()

    product.variants.forEach(variant => {
      const color = variant.option1 || variant.options?.find(o => o.name === 'Color')?.value
      if (color) {
        colors.add(color)
      }
    })

    return Array.from(colors)
  }
}

export const poizonService = new PoizonService()
export { PoizonService }