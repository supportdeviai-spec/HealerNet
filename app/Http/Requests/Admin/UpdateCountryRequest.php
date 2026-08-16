<?php

namespace App\Http\Requests\Admin;

use App\Enums\Status;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCountryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $countryId = $this->route('country')?->id ?? $this->route('id');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('countries', 'name')->ignore($countryId)],
            'code' => ['required', 'string', 'max:10', Rule::unique('countries', 'code')->ignore($countryId)],
            'phone_code' => ['nullable', 'string', 'max:10'],
            'status' => ['required', Rule::enum(Status::class)],
        ];
    }
}
