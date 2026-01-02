export const useAppSettings = () => {
    const client = useSupabaseClient()

    // State
    const currencySymbol = useState<string>('app-currency', () => 'Q') // Default fallback
    const loading = useState<boolean>('app-settings-loading', () => false)

    // Fetch settings
    const fetchSettings = async () => {
        loading.value = true
        try {
            const { data, error } = await client
                .from('app_settings')
                .select('value')
                .eq('key', 'currency_symbol')
                .single()

            if (!error && data) {
                // Remove quotes if they exist (fixes "L." issue)
                currencySymbol.value = String(data.value).replace(/^"|"$/g, '')
            } else {
                // If not set, maybe insert default? For now just use fallback
            }
        } catch (e) {
            console.error('Error fetching settings:', e)
        } finally {
            loading.value = false
        }
    }

    // Update setting
    const updateCurrencySymbol = async (newSymbol: string) => {
        loading.value = true
        try {
            // Clean input too, just in case
            const cleanSymbol = newSymbol.replace(/^"|"$/g, '')

            const { error } = await client
                .from('app_settings')
                .upsert({
                    key: 'currency_symbol',
                    value: JSON.stringify(cleanSymbol)
                }, { onConflict: 'key' })

            if (error) throw error

            currencySymbol.value = newSymbol
            return true
        } catch (e) {
            console.error('Error updating currency:', e)
            return false
        } finally {
            loading.value = false
        }
    }

    return {
        currencySymbol,
        loading,
        fetchSettings,
        updateCurrencySymbol
    }
}
