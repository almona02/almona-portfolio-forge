import { renderHook, act } from '@testing-library/react'
import { usePythonAPI } from '../usePythonAPI'

// Mock fetch
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('usePythonAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('identifyPart', () => {
    it('should successfully identify a part', async () => {
      const mockResponse = {
        success: true,
        data: {
          detections: [{
            bbox: [100, 200, 300, 400],
            confidence: 0.95,
            class_id: 1,
            class_name: 'gear',
            center: [200, 300]
          }],
          image_info: { width: 640, height: 480, channels: 3 },
          model_info: { framework: 'YOLOv8', confidence_threshold: 0.7 }
        },
        message: 'Part identified successfully'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => usePythonAPI())

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      await act(async () => {
        const response = await result.current.identifyPart(mockFile)
        expect(response).toEqual(mockResponse)
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => usePythonAPI())

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      await act(async () => {
        await expect(result.current.identifyPart(mockFile)).rejects.toThrow('Network error')
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Network error')
    })

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      } as Response)

      const { result } = renderHook(() => usePythonAPI())

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      await act(async () => {
        await expect(result.current.identifyPart(mockFile)).rejects.toThrow('Bad request')
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Bad request')
    })
  })

  describe('preprocessImage', () => {
    it('should successfully preprocess an image', async () => {
      const mockResponse = {
        success: true,
        data: {
          processed: true,
          operation: 'enhance',
          dimensions: { width: 640, height: 480 },
          size: 102400
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => usePythonAPI())

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      await act(async () => {
        const response = await result.current.preprocessImage(mockFile)
        expect(response).toEqual(mockResponse)
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })
  })
})
