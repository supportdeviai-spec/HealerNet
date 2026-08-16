<?php

namespace App\Http\Requests\Admin;

use App\Enums\Status;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCountryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'unique:countries,name'],
            'code' => ['required', 'string', 'max:10', 'unique:countries,code'],
            'phone_code' => ['nullable', 'string', 'max:10'],
            'status' => ['required', Rule::enum(Status::class)],
        ];
    }
}
