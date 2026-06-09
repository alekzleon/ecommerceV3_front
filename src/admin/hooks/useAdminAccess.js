function useAdminAccess(user) {
  const modules = user?.modules || user?.user?.modules || []

  const hasModule = (moduleName) => modules.includes(moduleName)

  const isInternal = Boolean(user?.is_internal ?? user?.user?.is_internal ?? true)

  return {
    modules,
    hasModule,
    isInternal,
  }
}

export default useAdminAccess