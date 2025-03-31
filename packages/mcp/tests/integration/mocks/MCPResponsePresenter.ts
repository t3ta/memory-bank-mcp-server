/**
 * Mock for MCPResponsePresenter
 */
export const MCPResponsePresenter = {
  success: (data: any) => ({
    success: true,
    data
  }),
  error: (error: any) => ({
    success: false,
    error: typeof error === 'string' ? error : error.message || 'Unknown error'
  })
};

export default {
  MCPResponsePresenter
};
